import mongoose, { Schema } from "mongoose";

const transactionSchema = new Schema({
  fromUser: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: [
      "DEPOSIT",
      "WITHDRAWAL",
      "GROUP_PAYMENT",
      "CREDIT_WITHDRAWAL",
      "MEMBER_FUNDS_ADDED",
    ],
    default: "DEPOSIT",
  },
  description: {
    type: String,
  },
  // How a GROUP_PAYMENT was divided, kept for auditability.
  memberCharges: {
    type: Map,
    of: Number,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const memberBalanceSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  balance: {
    type: Number,
    default: 0,
  },
});

const groupWalletSchema = new Schema(
  {
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    memberBalances: [memberBalanceSchema],
    currency: {
      type: String,
      default: "INR",
    },
    transactions: [transactionSchema],
  },
  {
    timestamps: true,
  }
);

export const GroupWallet = mongoose.model("GroupWallet", groupWalletSchema);
