import mongoose from "mongoose";

import { Group } from "../models/group.models.js";
import { GroupWallet } from "../models/groupWallet.models.js";
import { CreditWithdrawal } from "../models/creditWithdrawal.models.js";
import { UserWallet } from "../models/wallet.models.js";
import { Transaction } from "../models/transactions.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getIO } from "../socket.js";
import {
  creditUserWallet,
  debitGroupMember,
  getMemberShare,
  normalizeAmount,
} from "../utils/ledger.js";

/**
 * The group wallet holds one invariant: `balance` always equals the sum of
 * `memberBalances`. Every operation here preserves it.
 */

const assertMembership = (group, userId) => {
  const isMember =
    group.members.some((m) => m.toString() === userId.toString()) ||
    group.owner.toString() === userId.toString();

  if (!isMember) {
    throw new ApiError(403, "You are not a member of this group");
  }
};

/**
 * Take a member's unspent share back out of the group and into their personal
 * wallet.
 *
 * This is a single movement: the group total and the member's share both go
 * down, the personal wallet goes up. The previous implementation incremented
 * both group figures — which minted money — and had its solvency check
 * commented out.
 */
const withdrawCredits = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const amount = normalizeAmount(req.body.amount, "Withdrawal amount");
  const userId = req.user._id;

  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, "Group not found");

  assertMembership(group, userId);

  // Time-locked groups exist precisely to stop early withdrawals.
  if (group.releaseType === "time_locked" && group.isLocked) {
    const unlocked = group.unlockDate && group.unlockDate <= new Date();
    if (!unlocked) {
      throw new ApiError(
        403,
        "This group's funds are locked until " +
          (group.unlockDate ? group.unlockDate.toDateString() : "the unlock date")
      );
    }
  }

  // Fails loudly rather than overdrawing if the share is too small.
  const groupWallet = await debitGroupMember(groupId, userId, amount, {
    fromUser: userId,
    amount,
    type: "CREDIT_WITHDRAWAL",
    description: "Member withdrew their unspent share",
  });

  let wallet;
  try {
    wallet = await creditUserWallet(userId, amount);
  } catch (error) {
    // Put the money back where it came from; leaving it in limbo would be
    // worse than failing the request.
    await GroupWallet.findOneAndUpdate(
      { group: groupId, "memberBalances.user": userId },
      { $inc: { balance: amount, "memberBalances.$.balance": amount } }
    );
    throw error;
  }

  const record = await CreditWithdrawal.create({
    group: groupId,
    member: userId,
    amount,
    status: "settled",
    settledAt: new Date(),
    description: `Withdrew ${amount} from group "${group.name}"`,
  });

  await Transaction.create({
    user: userId,
    wallet: wallet._id,
    scope: "USER",
    intentId: `CW_${record._id}`,
    type: "CREDIT_WITHDRAWAL",
    amount,
    currency: wallet.currency || "INR",
    status: "COMPLETED",
    paymentStatus: "SUCCESS",
    description: `Withdrawal from group "${group.name}"`,
  });

  try {
    getIO().to(groupId).emit("creditsWithdrawn", {
      groupId,
      memberId: userId,
      amount,
      groupBalance: groupWallet.balance,
      memberBalance: getMemberShare(groupWallet, userId),
    });
  } catch (error) {
    console.error("Socket emit failed:", error.message);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        walletBalance: wallet.balance,
        groupBalance: groupWallet.balance,
        memberBalance: getMemberShare(groupWallet, userId),
        withdrawalRecord: record,
      },
      "Credits withdrawn successfully"
    )
  );
});

/**
 * Move part of the owner's share across to another member.
 *
 * The group total is untouched — this reallocates who the existing money
 * belongs to. The previous version decremented the total while incrementing a
 * share, which broke the invariant and always threw on save because its
 * transaction type was not in the schema enum.
 */
const addMemberFunds = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { memberId } = req.body;
  const amount = normalizeAmount(req.body.amount, "Amount");
  const ownerId = req.user._id;

  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, "Group not found");

  if (group.owner.toString() !== ownerId.toString()) {
    throw new ApiError(403, "Only the group owner can reallocate member funds");
  }

  if (memberId === ownerId.toString()) {
    throw new ApiError(400, "Cannot transfer funds to yourself");
  }

  const isMember = group.members.some((m) => m.toString() === memberId);
  if (!isMember) {
    throw new ApiError(400, "That user is not a member of this group");
  }

  const wallet = await GroupWallet.findOne({ group: groupId });
  if (!wallet) throw new ApiError(404, "Group wallet not found");

  if (getMemberShare(wallet, ownerId) < amount) {
    throw new ApiError(
      400,
      "You do not have enough of your own share in this group to transfer"
    );
  }

  const hasRow = wallet.memberBalances.some(
    (mb) => mb.user.toString() === memberId
  );

  // One update moves both sides, so the pair can never half-apply. Ids are cast
  // explicitly since Mongoose does not reliably cast arrayFilters values.
  const inc = { "memberBalances.$[from].balance": -amount };
  const arrayFilters = [
    {
      "from.user": new mongoose.Types.ObjectId(String(ownerId)),
      "from.balance": { $gte: amount },
    },
  ];
  const update = { $inc: inc };

  if (hasRow) {
    inc["memberBalances.$[to].balance"] = amount;
    arrayFilters.push({ "to.user": new mongoose.Types.ObjectId(String(memberId)) });
  } else {
    update.$push = { memberBalances: { user: memberId, balance: amount } };
  }

  update.$push = {
    ...(update.$push || {}),
    transactions: {
      fromUser: ownerId,
      amount,
      type: "MEMBER_FUNDS_ADDED",
      description: `Owner reallocated ${amount} to a member`,
    },
  };

  const updated = await GroupWallet.findOneAndUpdate(
    { group: groupId },
    update,
    { new: true, arrayFilters }
  );

  if (!updated) {
    throw new ApiError(400, "Balances changed while processing; please retry");
  }

  try {
    getIO().to(groupId).emit("memberFundsAdded", {
      groupId,
      memberId,
      amount,
      memberBalance: getMemberShare(updated, memberId),
      ownerBalance: getMemberShare(updated, ownerId),
    });
  } catch (error) {
    console.error("Socket emit failed:", error.message);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        memberBalance: getMemberShare(updated, memberId),
        ownerBalance: getMemberShare(updated, ownerId),
        groupBalance: updated.balance,
      },
      "Member funds updated successfully"
    )
  );
});

export { withdrawCredits, addMemberFunds };
