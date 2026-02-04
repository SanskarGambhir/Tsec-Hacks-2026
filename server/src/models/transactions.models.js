import mongoose, { Schema } from "mongoose";

const transactionSchema = new Schema(
  {
    user: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },

    wallet: {
      type: String,
      ref: "Wallet",
      required: true,
    },

    intentId: {
      type: String,
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["DEPOSIT", "SPEND", "REFUND", "GROUP_PAYMENT"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "USDC",
    },

    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED"],
      default: "PENDING",
      index: true,
    },

    proofHash: String,
    proofURI: String,

    paymentStatus: String, // raw status from payment API

  },
  { timestamps: true }
);

export const Transaction = mongoose.model("Transaction", transactionSchema);
