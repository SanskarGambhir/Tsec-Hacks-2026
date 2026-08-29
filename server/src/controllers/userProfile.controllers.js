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

  // `expenses` has to be selected for the count below to mean anything; it
  // was omitted before, so the stat always read zero.
  const groups = await Group.find({
    $or: [
      { owner: userId },
      { members: { $in: [userId] } }
    ]
  }).select("_id name description pool members expenses createdAt").lean();

  // Get user's credit withdrawals
  const creditWithdrawals = await CreditWithdrawal.find({ member: userId }).populate("group", "name");

  const totalGroups = groups.length;
  const totalExpenses = groups.reduce(
    (sum, group) => sum + (group.expenses?.length || 0),
    0
  );

  // One query for every wallet instead of one per group.
  const wallets = await GroupWallet.find({
    group: { $in: groups.map((g) => g._id) },
  })
    .select("group balance memberBalances")
    .lean();

  // "Settled" is what this user personally holds across their groups, not the
  // combined balance of every group they happen to be in.
  const totalSettled = wallets.reduce((sum, wallet) => {
    const entry = wallet.memberBalances.find(
      (mb) => mb.user.toString() === userId.toString()
    );
    return sum + (entry ? entry.balance : 0);
  }, 0);

  // Format response
  const userProfile = {
    _id: user._id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
    panCardLast4: user.panCardLast4,
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