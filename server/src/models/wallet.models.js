import mongoose, { Schema } from "mongoose";

const userWalletSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    balance: {
      type: Number,
      default: 0,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
    },

    status: {
      type: String,
      enum: ["ACTIVE", "FROZEN"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

export const UserWallet = mongoose.model("UserWallet", userWalletSchema);
