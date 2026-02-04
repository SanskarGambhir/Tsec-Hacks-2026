import { Friend } from '../models/friend.models.js';
import { User } from '../models/user.models.js';
import { PhoneInvite } from '../models/phoneInvite.models.js';
import { ApiResponse } from '../utils/api-response.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSMS } from '../utils/twilio.js';

// Send friend request
const sendFriendRequest = asyncHandler(async (req, res) => {
  const { recipientId } = req.body;
  const requesterId = req.user._id;

  if (!recipientId) {
    throw new ApiError(400, "Recipient ID is required");
  }

  if (requesterId.toString() === recipientId) {
    throw new ApiError(400, "You cannot send a friend request to yourself");
  }

  // Check if recipient exists
  const recipient = await User.findById(recipientId);
  if (!recipient) {
    throw new ApiError(404, "User not found");
  }

  // Check if friend request already exists
  const existingRequest = await Friend.findOne({
    $or: [
      { requester: requesterId, recipient: recipientId },
      { requester: recipientId, recipient: requesterId },
    ],
  });

  if (existingRequest) {
    if (existingRequest.status === "accepted") {
      throw new ApiError(400, "You are already friends with this user");
    }
    if (existingRequest.status === "pending") {
      throw new ApiError(400, "Friend request already sent");
    }
    if (existingRequest.status === "rejected") {
      // Update the rejected request to pending
      existingRequest.status = "pending";
      existingRequest.requester = requesterId;
      existingRequest.recipient = recipientId;
      await existingRequest.save();
      return res.status(200).json(
        new ApiResponse(200, existingRequest, "Friend request sent successfully")
      );
    }
  }

  // Create new friend request
  const friendRequest = await Friend.create({
    requester: requesterId,
    recipient: recipientId,
    status: "pending",
  });

  return res.status(201).json(
    new ApiResponse(201, friendRequest, "Friend request sent successfully")
  );
});

// Accept friend request
const acceptFriendRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const userId = req.user._id;

  const friendRequest = await Friend.findById(requestId);

  if (!friendRequest) {
    throw new ApiError(404, "Friend request not found");
  }

  // Check if the user is the recipient
  if (friendRequest.recipient.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to accept this request");
  }

  if (friendRequest.status !== "pending") {
    throw new ApiError(400, "This request is no longer pending");
  }

  friendRequest.status = "accepted";
  await friendRequest.save();

  // Populate the requester details
  await friendRequest.populate("requester", "username email avatar phone");

  return res.status(200).json(
    new ApiResponse(200, friendRequest, "Friend request accepted")
  );
});

// Reject friend request
const rejectFriendRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const userId = req.user._id;

  const friendRequest = await Friend.findById(requestId);

  if (!friendRequest) {
    throw new ApiError(404, "Friend request not found");
  }

  // Check if the user is the recipient
  if (friendRequest.recipient.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to reject this request");
  }

  if (friendRequest.status !== "pending") {
    throw new ApiError(400, "This request is no longer pending");
  }

  friendRequest.status = "rejected";
  await friendRequest.save();

  return res.status(200).json(
    new ApiResponse(200, friendRequest, "Friend request rejected")
  );
});

// Remove friend
const removeFriend = asyncHandler(async (req, res) => {
  const { friendId } = req.params;
  const userId = req.user._id;

  const friendship = await Friend.findOne({
    status: "accepted",
    $or: [
      { requester: userId, recipient: friendId },
      { requester: friendId, recipient: userId },
    ],
  });

  if (!friendship) {
    throw new ApiError(404, "Friendship not found");
  }

  await friendship.deleteOne();

  return res.status(200).json(
    new ApiResponse(200, {}, "Friend removed successfully")
  );
});

// Get all friends
const getFriends = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const friends = await Friend.getFriendsList(userId);

  return res.status(200).json(
    new ApiResponse(200, friends, "Friends fetched successfully")
  );
});

// Get pending friend requests (received)
const getPendingRequests = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const pendingRequests = await Friend.find({
    recipient: userId,
    status: "pending",
  }).populate("requester", "username email avatar phone");

  return res.status(200).json(
    new ApiResponse(200, pendingRequests, "Pending requests fetched successfully")
  );
});

// Get sent friend requests
const getSentRequests = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const sentRequests = await Friend.find({
    requester: userId,
    status: "pending",
  }).populate("recipient", "username email avatar phone");

  return res.status(200).json(
    new ApiResponse(200, sentRequests, "Sent requests fetched successfully")
  );
});

// Search users to add as friends
const searchUsers = asyncHandler(async (req, res) => {
  const { query } = req.query;
  const userId = req.user._id;

  if (!query) {
    throw new ApiError(400, "Search query is required");
  }

  // Search users by username, email, or phone
  const users = await User.find({
    _id: { $ne: userId }, // Exclude current user
    $or: [
      { username: { $regex: query, $options: "i" } },
      { email: { $regex: query, $options: "i" } },
      { phone: { $regex: query, $options: "i" } },
    ],
  }).select("username email avatar phone").limit(20);

  // Get friend statuses for each user
  const usersWithStatus = await Promise.all(
    users.map(async (user) => {
      const friendship = await Friend.findOne({
        $or: [
          { requester: userId, recipient: user._id },
          { requester: user._id, recipient: userId },
        ],
      });

      let friendshipStatus = "none";
      let friendshipId = null;

      if (friendship) {
        friendshipStatus = friendship.status;
        friendshipId = friendship._id;
        
        // Check if current user is requester or recipient
        if (friendship.requester.toString() === userId.toString() && friendship.status === "pending") {
          friendshipStatus = "sent";
        } else if (friendship.recipient.toString() === userId.toString() && friendship.status === "pending") {
          friendshipStatus = "received";
        }
      }

      return {
        ...user.toObject(),
        friendshipStatus,
        friendshipId,
      };
    })
  );

  return res.status(200).json(
    new ApiResponse(200, usersWithStatus, "Users fetched successfully")
  );
});

// Block a user
const blockUser = asyncHandler(async (req, res) => {
  const { userId: userIdToBlock } = req.params;
  const userId = req.user._id;

  if (userId.toString() === userIdToBlock) {
    throw new ApiError(400, "You cannot block yourself");
  }

  const friendship = await Friend.findOne({
    $or: [
      { requester: userId, recipient: userIdToBlock },
      { requester: userIdToBlock, recipient: userId },
    ],
  });

  if (friendship) {
    friendship.status = "blocked";
    await friendship.save();
  } else {
    await Friend.create({
      requester: userId,
      recipient: userIdToBlock,
      status: "blocked",
    });
  }

  return res.status(200).json(
    new ApiResponse(200, {}, "User blocked successfully")
  );
});

// Send phone invite
const sendPhoneInvite = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;
  const senderId = req.user._id;

  if (!phoneNumber) {
    throw new ApiError(400, "Phone number is required");
  }

  // Format phone number (ensure it has country code)
  let formattedPhone = phoneNumber.trim();
  if (!formattedPhone.startsWith('+')) {
    // Assuming India by default, change as needed
    formattedPhone = '+91' + formattedPhone;
  }

  // Check if user is trying to invite themselves
  if (req.user.phone === formattedPhone) {
    throw new ApiError(400, "You cannot send an invite to yourself");
  }

  // Check if a user with this phone already exists and is already a friend
  const existingUser = await User.findOne({ phone: formattedPhone });
  if (existingUser) {
    const friendship = await Friend.findOne({
      status: "accepted",
      $or: [
        { requester: senderId, recipient: existingUser._id },
        { requester: existingUser._id, recipient: senderId },
      ],
    });

    if (friendship) {
      throw new ApiError(400, "This user is already your friend");
    }

    // If user exists but not friends, send friend request instead
    const existingRequest = await Friend.findOne({
      $or: [
        { requester: senderId, recipient: existingUser._id },
        { requester: existingUser._id, recipient: senderId },
      ],
    });

    if (existingRequest && existingRequest.status === "pending") {
      throw new ApiError(400, "Friend request already pending");
    }

    // Create friend request
    const friendRequest = await Friend.create({
      requester: senderId,
      recipient: existingUser._id,
      status: "pending",
    });

    return res.status(201).json(
      new ApiResponse(201, friendRequest, "Friend request sent to existing user")
    );
  }

  // Check if there's already a pending invite for this phone
  const existingInvite = await PhoneInvite.findOne({
    sender: senderId,
    phoneNumber: formattedPhone,
    status: "pending",
    expiresAt: { $gt: Date.now() },
  });

  if (existingInvite) {
    throw new ApiError(400, "You already sent an invite to this phone number");
  }

  // Generate invite token
  const token = PhoneInvite.generateInviteToken();

  // Create invite
  const invite = await PhoneInvite.create({
    sender: senderId,
    phoneNumber: formattedPhone,
    token,
  });

  // Create invite link
  const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${token}`;

  // Skip SMS sending - user will share link manually
  console.log("📱 Invite created for:", formattedPhone);
  console.log("🔗 Invite link:", inviteLink);
  console.log("💡 User will share this link manually via WhatsApp/Telegram");

  return res.status(201).json(
    new ApiResponse(201, { inviteLink, phoneNumber: formattedPhone }, "Invite link created! Share it with your friend.")
  );
});

// Accept phone invite (called after user signs up/logs in with token)
const acceptPhoneInvite = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const userId = req.user._id;

  // Find valid invite
  const invite = await PhoneInvite.findValidInvite(token);

  if (!invite) {
    throw new ApiError(404, "Invalid or expired invite");
  }

  // Check if user's phone matches invite phone
  if (req.user.phone !== invite.phoneNumber) {
    throw new ApiError(400, "This invite was sent to a different phone number");
  }

  // Check if already friends
  const existingFriendship = await Friend.findOne({
    status: "accepted",
    $or: [
      { requester: invite.sender, recipient: userId },
      { requester: userId, recipient: invite.sender },
    ],
  });

  if (existingFriendship) {
    // Mark invite as accepted
    invite.status = "accepted";
    await invite.save();
    
    return res.status(200).json(
      new ApiResponse(200, {}, "You are already friends with this user")
    );
  }

  // Create or update friend request
  let friendRequest = await Friend.findOne({
    $or: [
      { requester: invite.sender, recipient: userId },
      { requester: userId, recipient: invite.sender },
    ],
  });

  if (friendRequest) {
    friendRequest.status = "accepted";
    await friendRequest.save();
  } else {
    friendRequest = await Friend.create({
      requester: invite.sender,
      recipient: userId,
      status: "accepted",
    });
  }

  // Mark invite as accepted
  invite.status = "accepted";
  await invite.save();

  // Populate sender info
  await friendRequest.populate("requester recipient", "username email avatar");

  return res.status(200).json(
    new ApiResponse(200, friendRequest, "Friend added successfully")
  );
});

export {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getFriends,
  getPendingRequests,
  getSentRequests,
  searchUsers,
  blockUser,
  sendPhoneInvite,
  acceptPhoneInvite,
};
