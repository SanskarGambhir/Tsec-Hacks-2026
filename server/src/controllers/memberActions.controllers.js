import { Group } from "../models/group.models.js";
import { GroupWallet } from "../models/groupWallet.models.js";
import { CreditWithdrawal } from "../models/creditWithdrawal.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getIO } from "../socket.js";

const withdrawCredits = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { memberId, amount } = req.body;

  if (!memberId || !amount || amount <= 0) {
    throw new ApiError(400, "Member ID and valid amount are required");
  }

  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  // Check if the user is the member requesting to withdraw or is the group owner
  const isMember = group.members.includes(req.user._id) || group.owner.toString() === req.user._id.toString();
  const isRequestingOwnWithdrawal = memberId.toString() === req.user._id.toString();

  if (!isMember || !isRequestingOwnWithdrawal) {
    throw new ApiError(403, "You can only withdraw credits from your own balance");
  }

  const groupWallet = await GroupWallet.findOne({ group: groupId });
  if (!groupWallet) {
    throw new ApiError(404, "Group wallet not found");
  }

  // Find the member's balance
  const memberBalanceIndex = groupWallet.memberBalances.findIndex(
    mb => mb.user.toString() === memberId.toString()
  );

  if (memberBalanceIndex === -1) {
    throw new ApiError(404, "Member balance not found");
  }

  const memberBalance = groupWallet.memberBalances[memberBalanceIndex];

  // Check if the member has enough balance to withdraw
  // if (memberBalance.balance < amount) {
  //   throw new ApiError(400, `Insufficient balance. Current balance: ₹${memberBalance.balance}, Requested: ₹${amount}`);
  // }

  // Update the member's balance (reduce it since they're taking credits out)
  groupWallet.memberBalances[memberBalanceIndex].balance += amount;

  // Add the withdrawn amount to the group pool
  group.balance += amount;

  // Add transaction record
  groupWallet.transactions.push({
    fromUser: req.user._id,
    amount,
    type: "CREDIT_WITH_DRAWAL",
    description: `Credits withdrawn by member ${memberId}`
  });

  // Create a credit withdrawal record with status 'issued'
  const creditWithdrawal = await CreditWithdrawal.create({
    group: groupId,
    member: memberId,
    amount: amount,
    status: 'issued', // Status is 'issued' when the withdrawal is made
    description: `Credit withdrawal of ₹${amount} by member ${memberId}`
  });

  await groupWallet.save();
  await group.save();

  // Emit real-time update
  try {
    const io = getIO();
    io.to(groupId).emit("creditsWithdrawn", {
      groupId,
      memberId,
      amount,
      newBalance: groupWallet.memberBalances[memberBalanceIndex].balance,
      newPool: group.pool,
      withdrawalRecord: creditWithdrawal
    });
  } catch (error) {
    console.error("Socket emit failed:", error);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        newBalance: groupWallet.memberBalances[memberBalanceIndex].balance,
        newPool: group.pool,
        withdrawalRecord: creditWithdrawal
      },
      "Credits withdrawn successfully"
    )
  );
});

const addMemberFunds = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { memberId, amount } = req.body;

  if (!memberId || !amount || amount <= 0) {
    throw new ApiError(400, "Member ID and valid amount are required");
  }

  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  // Check if the user is the group owner or an admin
  const isOwner = group.owner.toString() === req.user._id.toString();
  if (!isOwner) {
    throw new ApiError(403, "Only group owner can add funds to member balance");
  }

  const groupWallet = await GroupWallet.findOne({ group: groupId });
  if (!groupWallet) {
    throw new ApiError(404, "Group wallet not found");
  }

  // Check if the group has enough funds to add to the member's balance
  if (groupWallet.balance < amount) {
    throw new ApiError(400, `Insufficient group wallet balance. Available: ₹${groupWallet.balance}, Requested: ₹${amount}`);
  }

  // Find the member's balance
  const memberBalanceIndex = groupWallet.memberBalances.findIndex(
    mb => mb.user.toString() === memberId.toString()
  );

  if (memberBalanceIndex === -1) {
    // If member doesn't have a balance entry, create one
    groupWallet.memberBalances.push({
      user: memberId,
      balance: amount
    });
  } else {
    // Update existing balance
    groupWallet.memberBalances[memberBalanceIndex].balance += amount;
  }

  // Reduce the group wallet balance
  groupWallet.balance -= amount;

  // Add transaction record
  groupWallet.transactions.push({
    fromUser: req.user._id,
    amount,
    type: "MEMBER_FUNDS_ADDED",
    description: `Funds added to member ${memberId} by owner`
  });

  await groupWallet.save();

  // Emit real-time update
  try {
    const io = getIO();
    io.to(groupId).emit("memberFundsAdded", {
      groupId,
      memberId,
      amount,
      newBalance: memberBalanceIndex === -1 ? amount : groupWallet.memberBalances[memberBalanceIndex].balance
    });
  } catch (error) {
    console.error("Socket emit failed:", error);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        newBalance: memberBalanceIndex === -1 ? amount : groupWallet.memberBalances[memberBalanceIndex].balance
      },
      "Member funds added successfully"
    )
  );
});

export { withdrawCredits, addMemberFunds };