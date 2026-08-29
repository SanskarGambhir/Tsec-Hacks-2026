import mongoose from "mongoose";

import { UserWallet } from "../models/wallet.models.js";
import { GroupWallet } from "../models/groupWallet.models.js";
import { ApiError } from "./api-error.js";

/**
 * Money movement primitives.
 *
 * Every balance change goes through this module. Each helper performs a single
 * `findOneAndUpdate` where the solvency guard lives in the *filter*, not in a
 * preceding `if`. MongoDB applies filter + update atomically to one document,
 * so two concurrent requests can never both pass the guard and overdraw.
 *
 * Never mutate `balance` / `memberBalances[].balance` directly elsewhere.
 */

/** Reject anything that is not a finite, positive, 2-decimal currency amount. */
export const normalizeAmount = (value, label = "Amount") => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, `${label} must be a positive number`);
  }
  if (amount > 10_000_000) {
    throw new ApiError(400, `${label} exceeds the maximum allowed value`);
  }
  return Math.round(amount * 100) / 100;
};

/* ------------------------------------------------------------------ */
/* User wallet                                                         */
/* ------------------------------------------------------------------ */

export const creditUserWallet = async (userId, amount) => {
  const wallet = await UserWallet.findOneAndUpdate(
    { user: userId, status: "ACTIVE" },
    { $inc: { balance: amount } },
    { new: true }
  );
  if (!wallet) {
    throw new ApiError(404, "Wallet not found or frozen");
  }
  return wallet;
};

export const debitUserWallet = async (userId, amount) => {
  const wallet = await UserWallet.findOneAndUpdate(
    { user: userId, status: "ACTIVE", balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { new: true }
  );
  if (!wallet) {
    // Distinguish "no wallet" from "not enough money" for a useful message.
    const existing = await UserWallet.findOne({ user: userId });
    if (!existing) throw new ApiError(404, "Wallet not found");
    if (existing.status !== "ACTIVE") throw new ApiError(403, "Wallet is frozen");
    throw new ApiError(400, "Insufficient wallet balance");
  }
  return wallet;
};

/* ------------------------------------------------------------------ */
/* Group wallet                                                        */
/* ------------------------------------------------------------------ */

/**
 * Add to the group total and to one member's share of it.
 * Two shapes are needed because the member may not have a share row yet.
 */
export const creditGroupMember = async (groupId, userId, amount, transaction) => {
  const push = transaction ? { transactions: transaction } : {};

  const updated = await GroupWallet.findOneAndUpdate(
    { group: groupId, "memberBalances.user": userId },
    {
      $inc: { balance: amount, "memberBalances.$.balance": amount },
      ...(transaction ? { $push: push } : {}),
    },
    { new: true }
  );
  if (updated) return updated;

  // No share row yet — create it. The filter guards against a concurrent
  // request having created one in between, in which case we retry the $inc.
  const created = await GroupWallet.findOneAndUpdate(
    { group: groupId, "memberBalances.user": { $ne: userId } },
    {
      $inc: { balance: amount },
      $push: { memberBalances: { user: userId, balance: amount }, ...push },
    },
    { new: true }
  );
  if (created) return created;

  return creditGroupMember(groupId, userId, amount, transaction);
};

/** Remove from the group total and from one member's share, never below zero. */
export const debitGroupMember = async (groupId, userId, amount, transaction) => {
  const updated = await GroupWallet.findOneAndUpdate(
    {
      group: groupId,
      balance: { $gte: amount },
      memberBalances: { $elemMatch: { user: userId, balance: { $gte: amount } } },
    },
    {
      $inc: { balance: -amount, "memberBalances.$.balance": -amount },
      ...(transaction ? { $push: { transactions: transaction } } : {}),
    },
    { new: true }
  );
  if (!updated) {
    throw new ApiError(400, "Insufficient group balance for this member");
  }
  return updated;
};

/** Read one member's share without mutating anything. */
export const getMemberShare = (groupWallet, userId) => {
  const entry = groupWallet.memberBalances.find(
    (mb) => mb.user.toString() === userId.toString()
  );
  return entry ? entry.balance : 0;
};

/**
 * Charge several members at once for one group expense.
 *
 * Solvency for *every* member is verified before any write happens, so a
 * partially-applied expense is not possible. The whole set is then applied
 * with one update.
 */
export const chargeGroupMembers = async (groupId, charges, transaction) => {
  const wallet = await GroupWallet.findOne({ group: groupId });
  if (!wallet) throw new ApiError(404, "Group wallet not found");

  const total = Object.values(charges).reduce((sum, v) => sum + v, 0);

  if (wallet.balance < total) {
    throw new ApiError(
      400,
      `Insufficient group wallet balance. Available: ${wallet.balance}, required: ${total}`
    );
  }

  for (const [userId, amount] of Object.entries(charges)) {
    if (getMemberShare(wallet, userId) < amount) {
      throw new ApiError(
        400,
        `A member does not have enough balance to cover their share of ${amount}`
      );
    }
  }

  // One atomic update carrying a guard per member share. Ids are cast
  // explicitly because Mongoose does not reliably cast arrayFilters values,
  // and a string would silently fail to match a stored ObjectId.
  const arrayFilters = [];
  const inc = { balance: -total };

  Object.entries(charges).forEach(([userId, amount], idx) => {
    const key = `m${idx}`;
    inc[`memberBalances.$[${key}].balance`] = -amount;
    arrayFilters.push({
      [`${key}.user`]: new mongoose.Types.ObjectId(String(userId)),
      [`${key}.balance`]: { $gte: amount },
    });
  });

  const updated = await GroupWallet.findOneAndUpdate(
    { group: groupId, balance: { $gte: total } },
    { $inc: inc, ...(transaction ? { $push: { transactions: transaction } } : {}) },
    { new: true, arrayFilters }
  );

  if (!updated) {
    throw new ApiError(400, "Balances changed while processing; please retry");
  }
  return updated;
};
