import { Group } from "../models/group.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getIO } from "../socket.js";
import { chargeGroupMembers, normalizeAmount } from "../utils/ledger.js";
import { computeMemberCharges } from "../utils/splitEngine.js";

/**
 * Spend group money on something, dividing the cost between members.
 *
 * Division is delegated to `computeMemberCharges` so this path and the simpler
 * "log an expense" path cannot drift apart in what a split means, and the money
 * movement is delegated to `chargeGroupMembers` so solvency is checked for
 * every member before a single balance changes.
 */
const processGroupPayment = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const {
    description,
    divisionMethod = "even",
    excludedMembers = [],
    customAmounts = {},
    category,
  } = req.body;

  const amount = normalizeAmount(req.body.amount, "Payment amount");

  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, "Group not found");

  const userId = req.user._id;
  const isMember =
    group.members.some((m) => m.toString() === userId.toString()) ||
    group.owner.toString() === userId.toString();

  if (!isMember) {
    throw new ApiError(403, "You are not a member of this group");
  }

  if (group.releaseType === "time_locked" && group.isLocked) {
    const unlocked = group.unlockDate && group.unlockDate <= new Date();
    if (!unlocked) {
      throw new ApiError(403, "This group's funds are locked");
    }
  }

  const memberCharges = computeMemberCharges({
    amount,
    members: group.members,
    divisionMethod,
    excludedMembers,
    customAmounts,
  });

  // Throws before touching anything if the group or any member is short.
  const groupWallet = await chargeGroupMembers(groupId, memberCharges, {
    fromUser: userId,
    amount,
    type: "GROUP_PAYMENT",
    description,
    memberCharges,
  });

  const expense = {
    amount,
    description,
    spentBy: userId,
    paidBy: userId,
    date: new Date(),
    category: category || "General",
    divisionMethod,
    memberCharges,
  };

  // `$push` rather than a read-modify-save, so a concurrent expense on the same
  // group cannot be lost.
  const updatedGroup = await Group.findByIdAndUpdate(
    groupId,
    { $push: { expenses: expense }, $set: { pool: groupWallet.balance } },
    { new: true }
  );

  try {
    getIO().to(groupId).emit("expenseLogged", {
      groupId,
      pool: updatedGroup.pool,
      walletBalance: groupWallet.balance,
      expense,
    });
  } catch (error) {
    console.error("Socket emit failed:", error.message);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        expense,
        groupBalance: groupWallet.balance,
        memberBalances: groupWallet.memberBalances,
      },
      "Group payment processed successfully"
    )
  );
});

export { processGroupPayment };
