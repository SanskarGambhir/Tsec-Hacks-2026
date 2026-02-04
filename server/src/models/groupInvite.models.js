import mongoose, { Schema } from "mongoose";
import crypto from "crypto";

const groupInviteSchema = new Schema(
  {
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true
    },
    phoneNumber: {
      type: String,
      index: true
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "expired"],
      default: "pending",
      index: true
    },
    inviteType: {
      type: String,
      enum: ["friend", "phone"],
      required: true
    },
    expiresAt: {
      type: Date,
      default: () => Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      index: true
    }
  },
  { timestamps: true }
);

// TTL index to auto-delete expired invites
groupInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Generate random token
groupInviteSchema.statics.generateInviteToken = function () {
  return crypto.randomBytes(32).toString("hex");
};

// Find valid invite by token
groupInviteSchema.statics.findValidInvite = function (token) {
  return this.findOne({
    token,
    status: "pending",
    expiresAt: { $gt: Date.now() }
  })
  .populate("group", "name description owner")
  .populate("sender", "username email avatar");
};

export const GroupInvite = mongoose.model("GroupInvite", groupInviteSchema);
