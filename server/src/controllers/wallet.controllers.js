import crypto from "crypto";

import { UserWallet } from "../models/wallet.models.js";
import { Transaction } from "../models/transactions.models.js";
import { razorpayInstance } from "../utils/razorpay.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { creditUserWallet, normalizeAmount } from "../utils/ledger.js";

/**
 * Wallet money only ever enters through a Razorpay payment whose signature has
 * been verified server-side. There is deliberately no endpoint that credits a
 * balance on request.
 */

const getOrCreateWallet = async (userId) => {
  const existing = await UserWallet.findOne({ user: userId });
  if (existing) return existing;

  try {
    return await UserWallet.create({ user: userId, balance: 0, status: "ACTIVE" });
  } catch (error) {
    // Unique index on `user` — a concurrent request won the race, use theirs.
    if (error.code === 11000) return UserWallet.findOne({ user: userId });
    throw error;
  }
};

const addNewWallet = asyncHandler(async (req, res) => {
  const wallet = await getOrCreateWallet(req.user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, { wallet }, "Wallet ready"));
});

const getBalance = asyncHandler(async (req, res) => {
  const wallet = await getOrCreateWallet(req.user._id);

  return res.status(200).json(
    new ApiResponse(
      200,
      { balance: wallet.balance, currency: wallet.currency, status: wallet.status },
      "Balance fetched successfully"
    )
  );
});

const getUserTransactions = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 25, 100);

  const wallet = await UserWallet.findOne({ user: req.user._id });
  if (!wallet) {
    return res
      .status(200)
      .json(new ApiResponse(200, { transactions: [], total: 0, page, limit }, "No transactions"));
  }

  const filter = { user: req.user._id, wallet: wallet._id, scope: "USER" };

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { transactions, total, page, limit },
        "Transactions fetched successfully"
      )
    );
});

/** Step 1 of a deposit: create a Razorpay order and a matching PENDING row. */
const paymentIntentResponse = asyncHandler(async (req, res) => {
  const amount = normalizeAmount(req.body.amount, "Deposit amount");
  const wallet = await getOrCreateWallet(req.user._id);

  if (wallet.status !== "ACTIVE") {
    throw new ApiError(403, "Wallet is frozen");
  }

  const order = await razorpayInstance.orders.create({
    amount: Math.round(amount * 100), // Razorpay works in paise
    currency: "INR",
    receipt: `wlt_${Date.now()}`,
  });

  await Transaction.create({
    user: req.user._id,
    wallet: wallet._id,
    scope: "USER",
    intentId: order.id,
    type: "DEPOSIT",
    amount,
    currency: "INR",
    status: "PENDING",
    description: "Wallet top-up",
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { order, intentId: order.id }, "Order created"));
});

/**
 * Step 2: verify the gateway signature, then credit the wallet.
 *
 * The amount credited comes from our own PENDING row, never from the request
 * body, so a caller cannot claim to have paid more than they did. Flipping the
 * row to COMPLETED is itself the guard against replaying one payment twice.
 */
const paymentVerify = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ApiError(400, "Missing Razorpay payment details");
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const provided = Buffer.from(razorpay_signature);
  const expected = Buffer.from(expectedSignature);

  if (
    provided.length !== expected.length ||
    !crypto.timingSafeEqual(provided, expected)
  ) {
    throw new ApiError(400, "Invalid payment signature");
  }

  // Claim the pending transaction atomically. If another request already
  // settled it, this returns null and we stop.
  const tx = await Transaction.findOneAndUpdate(
    {
      intentId: razorpay_order_id,
      user: req.user._id,
      scope: "USER",
      status: "PENDING",
    },
    {
      $set: {
        status: "COMPLETED",
        paymentStatus: "SUCCESS",
        proofHash: razorpay_payment_id,
      },
    },
    { new: true }
  );

  if (!tx) {
    throw new ApiError(404, "Transaction not found or already verified");
  }

  const wallet = await creditUserWallet(req.user._id, tx.amount);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { balance: wallet.balance, transaction: tx },
        "Payment verified successfully"
      )
    );
});

export {
  addNewWallet,
  getBalance,
  getUserTransactions,
  paymentIntentResponse,
  paymentVerify,
};
