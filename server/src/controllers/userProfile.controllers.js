import { User } from "../models/user.models.js";
import { Group } from "../models/group.models.js";
import { GroupWallet } from "../models/groupWallet.models.js";
import { CreditWithdrawal } from "../models/creditWithdrawal.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get user details
  const user = await User.findById(userId).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Get user's groups
  const groups = await Group.find({
    $or: [
      { owner: userId },
      { members: { $in: [userId] } }
    ]
  }).select("_id name description pool members createdAt");

  // Get user's credit withdrawals
  const creditWithdrawals = await CreditWithdrawal.find({ member: userId }).populate("group", "name");

  // Calculate statistics
  let totalGroups = groups.length;
  let totalExpenses = 0;
  let totalSettled = 0;

  // Get all groups where user is a member to calculate expenses
  for (const group of groups) {
    totalExpenses += group.expenses?.length || 0;
    
    // Calculate settled amount from group wallets
    const groupWallet = await GroupWallet.findOne({ group: group._id });
    if (groupWallet) {
      totalSettled += groupWallet.balance;
    }
  }

  // Format response
  const userProfile = {
    _id: user._id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    location: user.location,
    avatar: user.avatar,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    stats: {
      groups: totalGroups,
      expenses: totalExpenses,
      settled: `₹${totalSettled.toFixed(2)}`,
      withdrawals: creditWithdrawals.length
    },
    groups: groups.map(group => ({
      _id: group._id,
      name: group.name,
      description: group.description,
      pool: group.pool,
      memberCount: group.members.length,
      createdAt: group.createdAt
    })),
    creditWithdrawals: creditWithdrawals.map(withdrawal => ({
      _id: withdrawal._id,
      group: withdrawal.group?.name,
      groupId: withdrawal.group?._id,
      amount: withdrawal.amount,
      status: withdrawal.status,
      issuedAt: withdrawal.issuedAt,
      settledAt: withdrawal.settledAt,
      description: withdrawal.description
    }))
  };

  return res.status(200).json(
    new ApiResponse(
      200,
      userProfile,
      "User profile retrieved successfully"
    )
  );
});

export { getUserProfile };