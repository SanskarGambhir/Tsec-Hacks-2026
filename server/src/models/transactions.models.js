import mongoose, { Schema } from "mongoose";

const transactionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Points at either a UserWallet or a GroupWallet depending on `scope`.
    wallet: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    scope: {
      type: String,
      enum: ["USER", "GROUP"],
      default: "USER",
      index: true,
    },

    // Razorpay order id for gateway deposits, or an internal reference for
    // ledger movements that never touch the gateway.
    intentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "DEPOSIT",
        "WITHDRAWAL",
        "SPEND",
        "REFUND",
        "GROUP_DEPOSIT",
        "GROUP_PAYMENT",
        "CREDIT_WITHDRAWAL",
        "MEMBER_FUNDS_ADDED",
      ],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
    },

    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED"],
      default: "PENDING",
      index: true,
    },

    description: String,

    // Razorpay payment id once verified.
    proofHash: String,
    proofURI: String,

    paymentStatus: String,
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, createdAt: -1 });

export const Transaction = mongoose.model("Transaction", transactionSchema);
