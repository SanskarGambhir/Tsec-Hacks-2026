import { ApiError } from "./api-error.js";

/**
 * Split calculation for scanned bills: items are either shared by everyone or
 * assigned to specific people.
 */
export const calculateSplit = (items, members) => {
  if (!Array.isArray(items) || !Array.isArray(members) || members.length === 0) {
    throw new ApiError(400, "Items and a non-empty members list are required");
  }

  const balances = Object.fromEntries(members.map((m) => [m, 0]));

  items.forEach((item) => {
    const price = Number(item.price) || 0;
    if (price <= 0) return;

    if (item.isShared) {
      const share = price / members.length;
      members.forEach((m) => {
        balances[m] += share;
      });
    } else if (Array.isArray(item.assignedTo) && item.assignedTo.length > 0) {
      const share = price / item.assignedTo.length;
      item.assignedTo.forEach((m) => {
        // Ignore assignments to people outside the member list rather than
        // silently creating a balance row for a stranger.
        if (m in balances) balances[m] += share;
      });
    }
  });

  Object.keys(balances).forEach((m) => {
    balances[m] = Math.round(balances[m] * 100) / 100;
  });

  return balances;
};

/**
 * Work out what each group member owes for one expense.
 *
 * This is the single source of truth for group expense division — both the
 * quick "log an expense" path and the detailed payment path use it, so the two
 * can no longer disagree about what a split means.
 *
 * @param {object}   options
 * @param {number}   options.amount           Total to divide.
 * @param {string[]} options.members          Every member id in the group.
 * @param {string}   [options.divisionMethod] even | custom | exclude
 * @param {string[]} [options.excludedMembers] Ids to skip (exclude method).
 * @param {object}   [options.customAmounts]  Explicit id -> amount map.
 * @returns {Record<string, number>} member id -> amount owed
 */
export const computeMemberCharges = ({
  amount,
  members,
  divisionMethod = "even",
  excludedMembers = [],
  customAmounts = {},
}) => {
  const memberIds = members.map((m) => m.toString());

  if (memberIds.length === 0) {
    throw new ApiError(400, "Group has no members to split the expense between");
  }

  if (divisionMethod === "custom") {
    const entries = Object.entries(customAmounts || {});
    if (entries.length === 0) {
      throw new ApiError(400, "Custom amounts are required for a custom split");
    }

    const charges = {};
    let total = 0;

    for (const [memberId, raw] of entries) {
      if (!memberIds.includes(memberId)) {
        throw new ApiError(400, "A custom amount refers to a non-member");
      }
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0) {
        throw new ApiError(400, "Custom amounts must be non-negative numbers");
      }
      if (value === 0) continue;

      charges[memberId] = Math.round(value * 100) / 100;
      total += charges[memberId];
    }

    if (Math.abs(total - amount) > 0.01) {
      throw new ApiError(
        400,
        `Custom amounts must sum to ${amount.toFixed(2)} (currently ${total.toFixed(2)})`
      );
    }
    return charges;
  }

  let payers = memberIds;

  if (divisionMethod === "exclude") {
    const excluded = (excludedMembers || []).map((m) => m.toString());
    payers = memberIds.filter((m) => !excluded.includes(m));
    if (payers.length === 0) {
      throw new ApiError(400, "No members remain to charge after exclusions");
    }
  }

  // Distribute evenly, then push the rounding remainder onto the first payer so
  // the charges always sum to exactly `amount` instead of drifting by a paisa.
  const share = Math.floor((amount / payers.length) * 100) / 100;
  const charges = Object.fromEntries(payers.map((m) => [m, share]));
  const remainder = Math.round((amount - share * payers.length) * 100) / 100;

  if (remainder !== 0) {
    charges[payers[0]] = Math.round((charges[payers[0]] + remainder) * 100) / 100;
  }

  return charges;
};
