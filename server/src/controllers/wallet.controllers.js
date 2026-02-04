import { response } from "express";
import { UserWallet } from "../models/wallet.models.js";
import payapi from "../utils/axios.js";
import axios from "axios";
import { Transaction } from "../models/transactions.models.js";
import pkg from "js-sha3";
const { keccak256 } = pkg;

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
    const response = await payapi.get(
      "https://api.fmm.finternetlab.io/api/v1/payment-intents/account/balance",
      {
        headers: {
          "X-API-KEY": "sk_hackathon_5d3da8cd5d11aa58990e3edd273b1dd6",
          "Content-Type": "application/json",
        },
      },
    );
    res.status(200).json({
      success: true,
      balance: response.data.data.availableBalance,
    });
  } catch (err) {
    console.log(err);
  }
};
export const checkPayments = async (req, res) => {
  try {
    const pendingTx = await Transaction.find({
      type: "DEPOSIT",
      status: "PENDING",
    });

    const updated = [];

    for (const tx of pendingTx) {
      try {
        const response = await axios.get(
          `https://api.fmm.finternetlab.io/api/v1/payment-intents/${tx.intentId}`,
          {
            headers: {
              "X-API-KEY": process.env.FINTERNET_API_KEY,
              "Content-Type": "application/json",
            },
          },
        );

        const remoteStatus =
          response.data?.data?.status || response.data?.status;

        // Only update paymentStatus, NOT the transaction status
        // Transaction should only be COMPLETED after proof is submitted
        const successStates = [
          "SUCCEEDED",
          "COMPLETED",
          "AWAITING_SETTLEMENT",
          "DELIVERED",
          "PROCESSING",
        ];

        if (successStates.includes(remoteStatus)) {
          // Only update the payment status, keep transaction as PENDING
          // User needs to verify proof before we mark as COMPLETED
          tx.paymentStatus = remoteStatus;
          await tx.save();

          updated.push({
            intentId: tx.intentId,
            amount: tx.amount,
            status: tx.status,
            paymentStatus: remoteStatus,
            requiresProof: true,
          });
        }
      } catch (err) {
        console.log("Payment check error:", err.message);
      }
    }

    res.status(200).json({
      success: true,
      updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const completeDeposit = async (req, res) => {
  console.log("hello");
  try {
    const { intentId } = req.params;

    const tx = await Transaction.findOne({
      intentId,
      status: "PENDING",
    });

    if (!tx) {
      return res
        .status(404)
        .json({ error: "Transaction not found or already completed" });
    }

    // 1️⃣ Prepare Proof Data
    const deliveryData = {
      intentId,
      timestamp: Date.now(),
      note: "Wallet funding confirmed",
    };

    // 2️⃣ Create Keccak Hash (same as Web3.keccak)
    const proofHash = "0x" + keccak256(JSON.stringify(deliveryData));

    const proofURI = `https://myapp.com/proofs/${intentId}`;
    console.log(intentId, proofHash, proofURI);
    // 3️⃣ Send Proof to Finternet
    const response = await axios.post(
      `https://api.fmm.finternetlab.io/api/v1/payment-intents/${intentId}/escrow/delivery-proof`,
      {
        proofHash,
        proofURI,
        submittedBy: process.env.MERCHANT_ADDRESS,
      },
      {
        headers: {
          "X-API-KEY": process.env.FINTERNET_API_KEY,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.data) {
      return res.status(400).json({ error: "Proof submission failed" });
    }

    // 4️⃣ IMMEDIATE LOCAL UPDATE
    tx.status = "COMPLETED";
    tx.proofHash = proofHash;
    tx.proofURI = proofURI;
    await tx.save();

    return res.json({ success: true });
  } catch (error) {
    console.log(error);   
    console.error("Proof error:", error.message);
    return res.status(500).json({ error: error.message });
  }
};
export const getUserTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({})
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
  const intentId = req.body.intentId;
  console.log(intentId);
  try {
    const response = await payapi.get(`/payment-intents/${intentId}/escrow`, {
      headers: {
        "X-API-Key": "sk_hackathon_5d3da8cd5d11aa58990e3edd273b1dd6",
      },
    });

    const status = response.data.data.status;
    console.log("Escrow status:", status);

    res.status(200).json({ success: true, status });
  } catch (err) {
    if (err.response?.status !== 404) {
      console.error("Verification error:", err);
    }
    res.status(500).json({ success: false, message: err.message });
  }
};
export const paymentIntentResponse = async (req, res) => {
  console.log("hello");
  const amount = req.body?.amount ? req.body.amount : "25.00";
  const response = await axios.post(
    "https://api.fmm.finternetlab.io/api/v1/payment-intents",
    {
      amount: String(amount), // API expects string
      currency: "USDC",
      type: "DELIVERY_VS_PAYMENT",

      settlementMethod: "OFF_RAMP_MOCK",
      settlementDestination: "bank_account_123",

      deliveryPeriod: 2592000,
      autoRelease: true,

      metadata: {
        releaseType: "TIME_LOCKED",
        timeLockUntil: "1735689600",
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": "sk_hackathon_5d3da8cd5d11aa58990e3edd273b1dd6",
      },
    },
  );

  await Transaction.create({
    user: "12345",
    wallet: "1234",
    intentId: response.data.id,
    type: "DEPOSIT",
    amount,
    status: "PENDING",
  });
  res.status(200).json({
    success: true,
    paymentUrl: response.data.data.paymentUrl,
    intentId: response.data.id,
  });
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
    console.log("bye");

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
