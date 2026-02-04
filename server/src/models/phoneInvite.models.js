import mongoose, { Schema } from "mongoose";
import crypto from "crypto";

const phoneInviteSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired"],
      default: "pending",
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  },
  { timestamps: true }
);

// Index for cleanup of expired invites
phoneInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to generate invite token
phoneInviteSchema.statics.generateInviteToken = function () {
  return crypto.randomBytes(32).toString("hex");
};

// Static method to find valid invite
phoneInviteSchema.statics.findValidInvite = async function (token) {
  return await this.findOne({
    token,
    status: "pending",
    expiresAt: { $gt: Date.now() },
  }).populate("sender", "username email avatar");
};

export const PhoneInvite = mongoose.model("PhoneInvite", phoneInviteSchema);
