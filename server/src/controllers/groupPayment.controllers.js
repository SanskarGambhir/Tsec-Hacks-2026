import { Group } from "../models/group.models.js";
import { GroupWallet } from "../models/groupWallet.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getIO } from "../socket.js";

const processGroupPayment = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { amount, description, divisionMethod, excludedMembers, customAmounts } = req.body;

  if (!amount || !description || !divisionMethod) {
    throw new ApiError(400, "Amount, description, and division method are required");
  }

  if (amount <= 0) {
    throw new ApiError(400, "Amount must be greater than 0");
  }

  const group = await Group.findById(groupId);

  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  // Check if the user is a member or owner
  const isMember = group.members.includes(req.user._id) || group.owner.toString() === req.user._id.toString();

  if (!isMember) {
    throw new ApiError(403, "You are not a member of this group");
  }

  const groupWallet = await GroupWallet.findOne({ group: groupId });
  if (!groupWallet) {
    throw new ApiError(404, "Group wallet not found");
  }

  // Check if group has sufficient balance
  if (groupWallet.balance < amount) {
    throw new ApiError(400, `Insufficient funds in group wallet. Available: ₹${groupWallet.balance}, Required: ₹${amount}`);
  }

  // Determine members to divide the expense among
  let membersToCharge = [...group.members];
  
  if (divisionMethod === 'exclude' && Array.isArray(excludedMembers)) {
    membersToCharge = membersToCharge.filter(memberId => 
      !excludedMembers.includes(memberId.toString())
    );
  }

  if (membersToCharge.length === 0) {
    throw new ApiError(400, "No members to charge after exclusions");
  }

  // Calculate amounts for each member
  let memberCharges = {};

  if (divisionMethod === 'custom' && customAmounts) {
    // Validate custom amounts sum up to the total amount
    const totalCustomAmount = Object.values(customAmounts).reduce((sum, val) => sum + parseFloat(val || 0), 0);
    if (Math.abs(totalCustomAmount - amount) > 0.01) {
      throw new ApiError(400, `Custom amounts must sum to the payment amount (₹${amount.toFixed(2)}). Current total: ₹${totalCustomAmount.toFixed(2)}`);
    }

    // Assign custom amounts to members
    for (const memberId in customAmounts) {
      const member = group.members.find(m => m.toString() === memberId);
      if (member) {
        memberCharges[memberId] = parseFloat(customAmounts[memberId]);
      }
    }
  } else {
    // Even division among selected members
    const amountPerMember = amount / membersToCharge.length;
    
    membersToCharge.forEach(memberId => {
      memberCharges[memberId.toString()] = parseFloat(amountPerMember.toFixed(2));
    });
  }

  // Validate that all members to charge exist in the group
  for (const memberId in memberCharges) {
    const memberExists = group.members.some(m => m.toString() === memberId);
    if (!memberExists) {
      throw new ApiError(400, `Member ${memberId} is not part of this group`);
    }
  }

  // Deduct the total amount from the group wallet
  groupWallet.balance -= amount;

  // Check if members have enough balance to cover their charges
  for (const memberId in memberCharges) {
    const chargeAmount = memberCharges[memberId];

    // Find member balance entry
    const memberBalanceEntry = groupWallet.memberBalances.find(
      mb => mb.user.toString() === memberId
    );

    const currentBalance = memberBalanceEntry ? memberBalanceEntry.balance : 0;

    // Check if the member's balance after deduction would go negative
    // This means they don't have enough to cover their share
    if (currentBalance - chargeAmount < 0) {
      throw new ApiError(400, `Member ${memberId} does not have enough balance to cover their share of ₹${chargeAmount}. Current balance: ₹${currentBalance}`);
    }
  }

  // Update member balances
  for (const memberId in memberCharges) {
    const chargeAmount = memberCharges[memberId];

    // Find or create member balance entry
    const memberBalanceIndex = groupWallet.memberBalances.findIndex(
      mb => mb.user.toString() === memberId
    );

    if (memberBalanceIndex > -1) {
      // Update existing balance
      groupWallet.memberBalances[memberBalanceIndex].balance -= chargeAmount;
    } else {
      // Create new balance entry
      groupWallet.memberBalances.push({
        user: memberId,
        balance: -chargeAmount
      });
    }
  }

  // Add transaction record
  groupWallet.transactions.push({
    fromUser: req.user._id,
    amount,
    type: "GROUP_PAYMENT",
    description,
    memberCharges // Store how the amount was divided
  });

  // Add to group expenses
  const expense = {
    amount,
    description,
    paidBy: req.user._id,
    date: new Date(),
    divisionMethod,
    memberCharges
  };

  group.expenses.push(expense);

  // Save changes
  await group.save();
  await groupWallet.save();

  // Emit real-time update
  try {
    const io = getIO();
    io.to(groupId).emit("expenseLogged", {
      groupId,
      pool: group.pool,
      walletBalance: groupWallet.balance,
      expense
    });
  } catch (error) {
    console.error("Socket emit failed:", error);
    // Continue execution, don't fail the request
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { 
          group,
          groupWallet,
          message: "Group payment processed successfully"
        },
        "Group payment processed successfully"
      )
    );
});

export { processGroupPayment };