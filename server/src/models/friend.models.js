import mongoose, { Schema } from "mongoose";

const friendSchema = new Schema(
  {
    requester: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "blocked"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate friend requests
friendSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// Static method to check if friendship exists
friendSchema.statics.areFriends = async function (userId1, userId2) {
  const friendship = await this.findOne({
    status: "accepted",
    $or: [
      { requester: userId1, recipient: userId2 },
      { requester: userId2, recipient: userId1 },
    ],
  });
  return !!friendship;
};

// Static method to get all friends of a user
friendSchema.statics.getFriendsList = async function (userId) {
  const friendships = await this.find({
    status: "accepted",
    $or: [{ requester: userId }, { recipient: userId }],
  }).populate("requester recipient", "username email avatar phone");

  return friendships.map((friendship) => {
    return friendship.requester._id.toString() === userId.toString()
      ? friendship.recipient
      : friendship.requester;
  });
};

export const Friend = mongoose.model("Friend", friendSchema);
