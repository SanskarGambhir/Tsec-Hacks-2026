import { response } from "express";
import { UserWallet } from "../models/wallet.models.js";
import { Transaction } from "../models/transactions.models.js";
import { razorpayInstance } from "../utils/razorpay.js";
import crypto from "crypto";
export const addNewWallet = async (req, res) => {
  try {
    const userId = req.user._id;

    // Check if wallet already exists
    const existingWallet = await UserWallet.findOne({ user: userId });
    if (existingWallet) {
      return res.status(200).json({
        success: true,
        message: "Wallet already exists",
        wallet: existingWallet,
      });
    }

    const newWallet = new UserWallet({
      user: userId,
      balance: 0,
      status: "ACTIVE",
    });
    await newWallet.save();
    console.log("New wallet created for user:", userId);
    return res.status(201).json({
      success: true,
      message: "Wallet created successfully",
      wallet: newWallet,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getBalance = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch wallet from database
    const wallet = await UserWallet.findOne({ user: userId });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    res.status(200).json({
      success: true,
      balance: wallet.balance,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
export const checkPayments = async (req, res) => {
  // Deprecated with Razorpay. Kept for backwards compatibility if needed.
  res.status(200).json({
    success: true,
    updated: [],
    message: "Use paymentVerify instead for Razorpay."
  });
};

export const completeDeposit = async (req, res) => {
  // Handled inside paymentVerify with Razorpay
  return res.status(200).json({ success: true, message: "Use paymentVerify for Razorpay" });
};
export const getUserTransactions = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user's wallet
    const userWallet = await UserWallet.findOne({ user: userId });

    if (!userWallet) {
      return res.status(200).json({
        success: true,
        count: 0,
        transactions: [],
      });
    }

    // Only fetch transactions from UserWallet, not GroupWallet
    const transactions = await Transaction.find({
      user: userId,
      wallet: userWallet._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const paymentVerify = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: "Missing Razorpay payment details" });
  }

  try {
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(400).json({ success: false, message: "Invalid Signature" });
    }

    // Find the pending transaction
    const tx = await Transaction.findOne({
      intentId: razorpay_order_id,
      status: "PENDING",
    });

    if (!tx) {
      return res.status(404).json({ success: false, message: "Transaction not found or already verified" });
    }

    // Update Transaction
    tx.status = "COMPLETED";
    tx.paymentStatus = "SUCCESS";
    tx.proofHash = razorpay_payment_id; 
    await tx.save();

    // Update Wallet Balance
    await UserWallet.findOneAndUpdate(
      { user: req.user._id, status: "ACTIVE" },
      { $inc: { balance: tx.amount } }
    );

    res.status(200).json({ success: true, message: "Payment verified successfully" });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const paymentIntentResponse = async (req, res) => {
  try {
    const amount = req.body?.amount ? req.body.amount : "25.00";
    
    // Razorpay expects amount in paise (smallest currency unit)
    const amountInPaise = Math.round(Number(amount) * 100);

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpayInstance.orders.create(options);

    const userWallet = await UserWallet.findOne({ user: req.user._id });

    await Transaction.create({
      user: req.user._id,
      wallet: userWallet._id,
      intentId: order.id,
      type: "DEPOSIT",
      amount: Number(amount),
      currency: "INR",
      status: "PENDING",
    });

    res.status(200).json({
      success: true,
      order: order,
      intentId: order.id,
    });
  } catch (error) {
    console.error("Razorpay order error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const addAmountToWallet = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount } = req.body;

    // 1️⃣ Validate
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid amount",
      });
    }

    // 2️⃣ Atomic balance increment
    const updatedWallet = await UserWallet.findOneAndUpdate(
      { user: userId, status: "ACTIVE" },
      { $inc: { balance: parsedAmount } }, // 🔥 atomic operation
      { new: true },
    );

    if (!updatedWallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found or inactive",
      });
    }

    res.status(200).json({
      success: true,
      message: "Amount added successfully",
      balance: updatedWallet.balance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export { addAmountToWallet };
