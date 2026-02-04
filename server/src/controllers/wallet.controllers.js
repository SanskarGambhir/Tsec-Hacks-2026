import { ApiResponse } from "../utils/api-response.js";
import mongoose from "mongoose";
import { UserWallet } from "../models/wallet.models.js";

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

const addAmountToWallet = async (req, res) => {
  console.log("Hello");
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
