import { Group } from "../models/group.models.js";
import { GroupWallet } from "../models/groupWallet.models.js";
import { CreditWithdrawal } from "../models/creditWithdrawal.models.js";
import { UserWallet } from "../models/wallet.models.js";
import { Transaction } from "../models/transactions.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getIO } from "../socket.js";

const settleCreditWithdrawal = asyncHandler(async (req, res) => {
  const { withdrawalId } = req.params;

  if (!withdrawalId) {
    throw new ApiError(400, "Withdrawal ID is required");
  }

  // Find the credit withdrawal record
  const creditWithdrawal = await CreditWithdrawal.findById(withdrawalId);
  if (!creditWithdrawal) {
    throw new ApiError(404, "Credit withdrawal record not found");
  }

  // Check if the withdrawal is already settled
  if (creditWithdrawal.status === 'settled') {
    throw new ApiError(400, "Credit withdrawal is already settled");
  }

  // Find the user's wallet
  const userWallet = await UserWallet.findOne({ user: creditWithdrawal.member });
  if (!userWallet) {
    throw new ApiError(404, "User wallet not found");
  }

  // Check if user has sufficient balance
  if (userWallet.balance < creditWithdrawal.amount) {
    throw new ApiError(400, "Insufficient balance in user wallet to settle this withdrawal");
  }

  // Update user wallet balance
  userWallet.balance -= creditWithdrawal.amount;
  await userWallet.save();

  // Update the status to 'settled' and set the settlement date
  creditWithdrawal.status = 'settled';
  creditWithdrawal.settledAt = new Date();
  await creditWithdrawal.save();

  // Create a transaction record
  await Transaction.create({
    user: creditWithdrawal.member,
    wallet: userWallet._id,
    intentId: `SETTLE_CW_${creditWithdrawal._id}`,
    type: "CREDIT_WITH_DRAWAL",
    amount: creditWithdrawal.amount,
    currency: userWallet.currency || "INR",
    status: "COMPLETED",
    paymentStatus: "SUCCESS"
  });

  // Emit real-time update
  try {
    const io = getIO();
    io.to(creditWithdrawal.group.toString()).emit("creditWithdrawalSettled", {
      withdrawalId: creditWithdrawal._id,
      memberId: creditWithdrawal.member,
      amount: creditWithdrawal.amount,
      settledAt: creditWithdrawal.settledAt
    });
  } catch (error) {
    console.error("Socket emit failed:", error);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        withdrawalRecord: creditWithdrawal,
        updatedWalletBalance: userWallet.balance
      },
      "Credit withdrawal settled and wallet balance updated successfully"
    )
  );
});

export { settleCreditWithdrawal };