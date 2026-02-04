import mongoose, { Schema } from 'mongoose';

const transactionSchema = new Schema({
  fromUser: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ["DEPOSIT", "WITHDRAWAL"], // In case funds are returned or spent directly
    default: "DEPOSIT"
  },
  date: {
    type: Date,
    default: Date.now
  }
});

const groupWalletSchema = new Schema(
  {
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      unique: true,
      index: true
    },
    balance: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: "INR"
    },
    transactions: [transactionSchema]
  },
  {
    timestamps: true
  }
);

export const GroupWallet = mongoose.model("GroupWallet", groupWalletSchema);
