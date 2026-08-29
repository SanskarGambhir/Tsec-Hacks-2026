import crypto from "crypto";
import { Group } from "../models/group.models.js";
import { GroupWallet } from "../models/groupWallet.models.js";
import { UserWallet } from "../models/wallet.models.js";
import { GroupInvite } from "../models/groupInvite.models.js";
import { User } from "../models/user.models.js";
import { Transaction } from "../models/transactions.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getIO } from "../socket.js";
import { sendWhatsApp } from "../utils/twilio.js";
import { razorpayInstance } from "../utils/razorpay.js";
import {
  chargeGroupMembers,
  creditGroupMember,
  creditUserWallet,
  debitGroupMember,
  debitUserWallet,
  getMemberShare,
  normalizeAmount,
} from "../utils/ledger.js";
import { computeMemberCharges } from "../utils/splitEngine.js";

/**
 * `group.pool` is a denormalised copy of `groupWallet.balance` kept for the UI.
 * It is only ever written from the wallet's authoritative balance, never
 * incremented on its own — that drift is what let it go negative before.
 */
/** Keeps a chat's history bounded so the group document cannot hit 16MB. */
const MAX_STORED_MESSAGES = 500;

const syncPool = (groupId, balance) =>
  Group.findByIdAndUpdate(groupId, { $set: { pool: balance } }, { new: true });

const assertMember = (group, userId) => {
  const isMember =
    group.members.some((m) => (m._id || m).toString() === userId.toString()) ||
    (group.owner._id || group.owner).toString() === userId.toString();

  if (!isMember) {
    throw new ApiError(403, "You are not a member of this group");
  }
};

const assertUnlocked = (group) => {
  if (group.releaseType !== "time_locked" || !group.isLocked) return;
  if (group.unlockDate && group.unlockDate <= new Date()) return;
  throw new ApiError(403, "This group's funds are locked");
};const createGroup = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    rules,
    pool,
    ruleType,
    releaseType,
    unlockDate,
    isLocked,
    milestones,
  } = req.body;

  if (!name || !rules || !Array.isArray(rules) || rules.length === 0) {
    throw new ApiError(400, "Name and rules (array) are required fields");
  }

  // Check if any rule specifies the group type
  const hasGroupType = rules.some(
    (rule) => rule.ruleType === "pool" || rule.ruleType === "regular_split",
  );

  // If no group type is specified, default to 'pool'
  if (!hasGroupType) {
    rules.push({
      ruleType: "pool",
      ruleValue: "Pool-based group",
      description: "Money is collected in a shared pool",
    });
  }

  const initialPool = pool ? normalizeAmount(pool, "Pool amount") : 0;

  const group = await Group.create({
    name,
    description: description || "",
    rules,
    ruleType,
    releaseType: releaseType || "instant",
    unlockDate: unlockDate || null,
    isLocked: isLocked || false,
    milestones: milestones || [],
    pool: initialPool,
    owner: req.user._id,
    members: [req.user._id], // Owner is automatically a member
  });

  const createdGroup = await Group.findById(group._id);

  if (!createdGroup) {
    throw new ApiError(500, "Something went wrong while creating the group");
  }

  // Seed the pool from the owner's wallet. The debit is guarded atomically, so
  // two concurrent group creations cannot both spend the same balance.
  let ownerWallet = null;
  if (initialPool > 0) {
    try {
      ownerWallet = await debitUserWallet(req.user._id, initialPool);
    } catch (error) {
      // The group has no wallet and no members' money yet, so removing it is a
      // complete rollback.
      await Group.findByIdAndDelete(group._id);
      throw error;
    }
  }

  // Create Group Wallet
  const groupWallet = await GroupWallet.create({
    group: createdGroup._id,
    balance: initialPool,
    currency: "INR",
    memberBalances: initialPool > 0
      ? [{ user: req.user._id, balance: initialPool }]
      : [],
    transactions: initialPool > 0
      ? [{
          fromUser: req.user._id,
          amount: initialPool,
          type: "DEPOSIT",
          description: "Initial pool contribution",
        }]
      : [],
  });

  if (initialPool > 0 && ownerWallet) {
    await Transaction.create({
      user: req.user._id,
      wallet: ownerWallet._id,
      scope: "USER",
      intentId: `GROUP_INIT_${createdGroup._id}`,
      type: "GROUP_DEPOSIT",
      amount: initialPool,
      currency: ownerWallet.currency || "INR",
      status: "COMPLETED",
      paymentStatus: "SUCCESS",
      description: `Initial pool for group "${createdGroup.name}"`,
    });
  }

  // Link Wallet to Group
  createdGroup.wallet = groupWallet._id;
  await createdGroup.save();

  return res
    .status(201)
    .json(new ApiResponse(201, createdGroup, "Group created successfully"));
});


/**
 * Move money from the caller's personal wallet into their share of the group
 * pool. Gateway-funded deposits go through groupPaymentIntent instead.
 */
const addFundsToGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const amount = normalizeAmount(req.body.amount, "Amount");
  const userId = req.user._id;

  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, "Group not found");

  assertMember(group, userId);

  const groupWallet = await GroupWallet.findOne({ group: groupId });
  if (!groupWallet) throw new ApiError(404, "Group wallet not found");

  // Debit first: if this throws for insufficient funds nothing has moved yet.
  const userWallet = await debitUserWallet(userId, amount);

  let updatedWallet;
  try {
    updatedWallet = await creditGroupMember(groupId, userId, amount, {
      fromUser: userId,
      amount,
      type: "DEPOSIT",
      description: "Wallet transfer to group pool",
    });
  } catch (error) {
    // Never strand the money between the two wallets.
    await creditUserWallet(userId, amount);
    throw error;
  }

  await Transaction.create({
    user: userId,
    wallet: userWallet._id,
    scope: "USER",
    intentId: `GROUP_ADD_${groupId}_${Date.now()}`,
    type: "GROUP_DEPOSIT",
    amount,
    currency: userWallet.currency || "INR",
    status: "COMPLETED",
    paymentStatus: "SUCCESS",
    description: `Transfer to group "${group.name}"`,
  });

  const updatedGroup = await syncPool(groupId, updatedWallet.balance);

  try {
    getIO().to(groupId).emit("fundsAdded", {
      groupId,
      addedBy: userId,
      amount,
      newPoolBalance: updatedGroup.pool,
      newWalletBalance: updatedWallet.balance,
    });
  } catch (error) {
    console.error("Socket emit failed:", error.message);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        groupPool: updatedGroup.pool,
        groupWalletBalance: updatedWallet.balance,
        memberBalance: getMemberShare(updatedWallet, userId),
        walletBalance: userWallet.balance,
      },
      "Funds added successfully"
    )
  );
});


/**
 * Record a group expense and charge it to members.
 *
 * Division goes through the same `computeMemberCharges` helper the detailed
 * payment path uses, so "even", "custom" and "exclude" behave identically
 * whichever endpoint the client calls. Previously this path ignored the
 * requested method and always split evenly.
 */
const logExpense = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const {
    description,
    category,
    divisionMethod = "even",
    excludedMembers = [],
    customAmounts = {},
  } = req.body;

  const amount = normalizeAmount(req.body.amount, "Amount");
  const userId = req.user._id;

  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, "Group not found");

  assertMember(group, userId);
  assertUnlocked(group);

  const memberCharges = computeMemberCharges({
    amount,
    members: group.members,
    divisionMethod,
    excludedMembers,
    customAmounts,
  });

  // Verifies every member can cover their share before anything is written.
  const groupWallet = await chargeGroupMembers(groupId, memberCharges, {
    fromUser: userId,
    amount,
    type: "GROUP_PAYMENT",
    description,
    memberCharges,
  });

  const expense = {
    amount,
    description,
    spentBy: userId,
    paidBy: userId,
    date: new Date(),
    category: category || "General",
    divisionMethod,
    memberCharges,
  };

  const updatedGroup = await Group.findByIdAndUpdate(
    groupId,
    { $push: { expenses: expense }, $set: { pool: groupWallet.balance } },
    { new: true }
  );

  try {
    getIO().to(groupId).emit("expenseLogged", {
      groupId,
      pool: updatedGroup.pool,
      walletBalance: groupWallet.balance,
      expense,
    });
  } catch (error) {
    console.error("Socket emit failed:", error.message);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        expense,
        groupBalance: groupWallet.balance,
        memberBalances: groupWallet.memberBalances,
      },
      "Expense logged successfully"
    )
  );
});

const addRule = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { ruleType, ruleValue, description } = req.body;

  if (!ruleType || !ruleValue) {
    throw new ApiError(400, "Rule type and value are required");
  }

  const group = await Group.findById(groupId);

  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  // Check if the user is the owner (only owner should typically add rules, or update this logic if needed)
  if (group.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only the group owner can add rules");
  }

  const newRule = {
    ruleType,
    ruleValue,
    description: description || "",
  };

  group.rules.push(newRule);
  await group.save();

  // Emit real-time update
  try {
    const io = getIO();
    io.to(groupId).emit("ruleAdded", {
      groupId,
      rule: newRule,
    });
  } catch (error) {
    console.error("Socket emit failed:", error);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, group, "Rule added successfully"));
});

const removeRule = asyncHandler(async (req, res) => {
  const { groupId, ruleIndex } = req.params; // Using index from URL params

  if (ruleIndex === undefined || ruleIndex < 0) {
    throw new ApiError(400, "Rule index is required and must be a valid index");
  }

  const group = await Group.findById(groupId);

  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  // Check if the user is the owner (only owner should typically remove rules)
  if (group.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only the group owner can remove rules");
  }

  // Validate rule index (convert string to number)
  const ruleIndexNum = parseInt(ruleIndex);
  if (isNaN(ruleIndexNum) || ruleIndexNum >= group.rules.length) {
    throw new ApiError(400, "Invalid rule index");
  }

  // Store the removed rule for response
  const removedRule = group.rules[ruleIndexNum];

  // Remove the rule at the specified index
  group.rules.splice(ruleIndexNum, 1);
  await group.save();

  // Emit real-time update
  try {
    const io = getIO();
    io.to(groupId).emit("ruleRemoved", {
      groupId,
      rule: removedRule,
      ruleIndex: ruleIndexNum
    });
  } catch (error) {
    console.error("Socket emit failed:", error);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, group, "Rule removed successfully"));
});


const joinGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;

  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, "Group not found");

  const alreadyMember =
    group.members.some((m) => m.toString() === userId.toString()) ||
    group.owner.toString() === userId.toString();

  if (alreadyMember) {
    throw new ApiError(400, "You are already a member of this group");
  }

  const groupWallet = await GroupWallet.findOne({ group: groupId });
  if (!groupWallet) throw new ApiError(404, "Group wallet not found");

  const contribution = req.body.amount
    ? normalizeAmount(req.body.amount, "Contribution")
    : 0;

  // Add the member first with a guarded update: `$ne` makes this a no-op if a
  // concurrent request already added them, so membership cannot duplicate.
  const joined = await Group.findOneAndUpdate(
    { _id: groupId, members: { $ne: userId } },
    { $addToSet: { members: userId } },
    { new: true }
  );

  if (!joined) throw new ApiError(400, "You are already a member of this group");

  let wallet = groupWallet;

  if (contribution > 0) {
    let userWallet;
    try {
      userWallet = await debitUserWallet(userId, contribution);
    } catch (error) {
      // Joining is only worthwhile with the contribution they asked for, so
      // undo the membership rather than silently joining with nothing.
      await Group.findByIdAndUpdate(groupId, { $pull: { members: userId } });
      throw error;
    }

    wallet = await creditGroupMember(groupId, userId, contribution, {
      fromUser: userId,
      amount: contribution,
      type: "DEPOSIT",
      description: "Contribution on joining",
    });

    await Transaction.create({
      user: userId,
      wallet: userWallet._id,
      scope: "USER",
      intentId: `GROUP_JOIN_${groupId}_${Date.now()}`,
      type: "GROUP_DEPOSIT",
      amount: contribution,
      currency: userWallet.currency || "INR",
      status: "COMPLETED",
      paymentStatus: "SUCCESS",
      description: `Joined group "${group.name}"`,
    });

    await syncPool(groupId, wallet.balance);
  }

  const updatedGroup = await Group.findById(groupId)
    .populate("owner", "username email avatar")
    .populate("members", "username email avatar")
    .lean();

  try {
    getIO().to(groupId).emit("memberJoined", {
      groupId,
      user: {
        _id: userId,
        username: req.user.username,
        email: req.user.email,
      },
    });
  } catch (error) {
    console.error("Socket emit failed:", error.message);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...updatedGroup,
        wallet: {
          balance: wallet.balance,
          currency: wallet.currency,
          memberBalance: getMemberShare(wallet, userId),
        },
      },
      "Successfully joined the group"
    )
  );
});

const getGroupDetails = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const group = await Group.findById(groupId)
    .populate("owner", "username email")
    .populate("members", "username email")
    .populate("expenses.paidBy", "username email")
    .populate("expenses.spentBy", "username email")
    .populate("wallet"); // Populate wallet for detailed info

  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  // Check if the user is a member or owner of the group
  const isMember =
    group.members.some(
      (member) => member._id.toString() === req.user._id.toString(),
    ) || group.owner._id.toString() === req.user._id.toString();

  if (!isMember) {
    throw new ApiError(403, "You are not authorized to view this group");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, group, "Group details retrieved successfully"));
});


const sendMessage = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { content } = req.body;
  const userId = req.user._id;

  const group = await Group.findById(groupId).select("members owner");
  if (!group) throw new ApiError(404, "Group not found");

  assertMember(group, userId);

  const message = { content: content.trim(), sender: userId, timestamp: new Date() };

  // `$push` with `$slice` appends and trims in one atomic step: concurrent
  // messages cannot overwrite each other, and the document cannot grow past
  // MongoDB's 16MB ceiling.
  await Group.findByIdAndUpdate(groupId, {
    $push: { messages: { $each: [message], $slice: -MAX_STORED_MESSAGES } },
  });

  const payload = {
    ...message,
    sender: {
      _id: userId,
      username: req.user.username,
      email: req.user.email,
      avatar: req.user.avatar,
    },
  };

  try {
    getIO().to(groupId).emit("newMessage", { groupId, message: payload });
  } catch (error) {
    console.error("Socket emit failed:", error.message);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { message: payload }, "Message sent successfully"));
});

/**
 * Messages are paginated newest-first so a long-running group chat does not
 * ship its entire history on every open.
 */
const getMessages = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const page = Math.max(Number(req.query.page) || 1, 1);

  const group = await Group.findById(groupId)
    .select("members owner messages")
    .populate("messages.sender", "username email avatar")
    .lean();

  if (!group) throw new ApiError(404, "Group not found");

  assertMember(group, userId);

  const all = group.messages || [];
  const total = all.length;
  const end = Math.max(total - (page - 1) * limit, 0);
  const start = Math.max(end - limit, 0);

  return res.status(200).json(
    new ApiResponse(
      200,
      { messages: all.slice(start, end), total, page, limit },
      "Messages fetched successfully"
    )
  );
});

const getUserGroups = asyncHandler(async (req, res) => {
  // Find all groups where the user is either owner or member
  const groups = await Group.find({
    $or: [{ owner: req.user._id }, { members: { $in: [req.user._id] } }],
  })
    .populate("owner", "username email")
    .populate("members", "username email")
    .populate("wallet")
    .sort({ updatedAt: -1 }); // Sort by most recently updated

  if (!groups) {
    throw new ApiError(500, "Error fetching user groups");
  }

  // Format the response to match the frontend expectations
  const formattedGroups = groups.map((group) => {
    // Calculate user's share or balance if needed
    const userIsOwner = group.owner._id.toString() === req.user._id.toString();
    const userIsMember = group.members.some(
      (member) => member._id.toString() === req.user._id.toString(),
    );

    return {
      _id: group._id,
      id: group._id, // For frontend compatibility
      name: group.name,
      description: group.description,
      members: group.members.length,
      balance: group.wallet?.balance || 0,
      yourShare: 0, // Placeholder - could calculate actual share if needed
      avatar: group.name.charAt(0).toUpperCase(), // Generate avatar from first letter
      color: "from-blue-500 to-cyan-500", // Default gradient
      isPinned: false, // Default value
      lastActivity: group.updatedAt, // Use updatedAt as last activity
      hasPool: group.wallet?.balance > 0,
      owner: group.owner,
      createdAt: group.createdAt,
    };
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        formattedGroups,
        "User groups retrieved successfully",
      ),
    );
});

// Send group invite to friend
const sendGroupInviteToFriend = asyncHandler(async (req, res) => {
  const { groupId, friendId } = req.body;
  const senderId = req.user._id;

  if (!groupId || !friendId) {
    throw new ApiError(400, "Group ID and Friend ID are required");
  }

  // Check if group exists and user is owner or member
  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  const isAuthorized =
    group.owner.toString() === senderId.toString() ||
    group.members.some((m) => m.toString() === senderId.toString());

  if (!isAuthorized) {
    throw new ApiError(
      403,
      "You are not authorized to invite members to this group",
    );
  }

  // Check if friend exists
  const friend = await User.findById(friendId);
  if (!friend) {
    throw new ApiError(404, "Friend not found");
  }

  // Check if already a member
  if (group.members.some((m) => m.toString() === friendId)) {
    throw new ApiError(400, "User is already a member of this group");
  }

  // Check for existing pending invite
  const existingInvite = await GroupInvite.findOne({
    group: groupId,
    recipient: friendId,
    status: "pending",
    expiresAt: { $gt: Date.now() },
  });

  if (existingInvite) {
    throw new ApiError(400, "Invite already sent to this user");
  }

  // Generate token
  const token = GroupInvite.generateInviteToken();

  // Create invite
  const invite = await GroupInvite.create({
    group: groupId,
    sender: senderId,
    recipient: friendId,
    token,
    inviteType: "friend",
  });

  await invite.populate([
    { path: "group", select: "name description" },
    { path: "sender", select: "username email" },
  ]);

  return res
    .status(201)
    .json(new ApiResponse(201, invite, "Group invite sent successfully"));
});

// Send group invite via WhatsApp
const sendGroupInviteViaWhatsApp = asyncHandler(async (req, res) => {
  const { groupId, phoneNumber } = req.body;
  const senderId = req.user._id;

  if (!groupId || !phoneNumber) {
    throw new ApiError(400, "Group ID and phone number are required");
  }

  // Check if group exists and user is authorized
  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  const isAuthorized =
    group.owner.toString() === senderId.toString() ||
    group.members.some((m) => m.toString() === senderId.toString());

  if (!isAuthorized) {
    throw new ApiError(
      403,
      "You are not authorized to invite members to this group",
    );
  }

  // Format phone number
  let formattedPhone = phoneNumber.trim();
  if (!formattedPhone.startsWith("+")) {
    formattedPhone = "+91" + formattedPhone;
  }

  // Check if phone belongs to existing user
  const existingUser = await User.findOne({ phone: formattedPhone });
  if (existingUser) {
    // Check if already a member
    if (
      group.members.some((m) => m.toString() === existingUser._id.toString())
    ) {
      throw new ApiError(400, "User is already a member of this group");
    }
  }

  // Check for existing pending invite
  const existingInvite = await GroupInvite.findOne({
    group: groupId,
    phoneNumber: formattedPhone,
    status: "pending",
    expiresAt: { $gt: Date.now() },
  });

  if (existingInvite) {
    throw new ApiError(400, "Invite already sent to this phone number");
  }

  // Generate token
  const token = GroupInvite.generateInviteToken();

  // Create invite
  const invite = await GroupInvite.create({
    group: groupId,
    sender: senderId,
    phoneNumber: formattedPhone,
    token,
    inviteType: "phone",
    recipient: existingUser?._id,
  });

  // Create invite link
  const inviteLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/group-invite/${token}`;

  // Send WhatsApp message
  try {
    await sendWhatsApp(
      formattedPhone,
      `${req.user.username} invited you to join "${group.name}" group on Cooper! Click here to accept: ${inviteLink}`,
    );
  } catch (error) {
    await invite.deleteOne();
    throw new ApiError(500, `Failed to send WhatsApp: ${error.message}`);
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { inviteLink, phoneNumber: formattedPhone },
        "WhatsApp group invite sent successfully",
      ),
    );
});

// Get pending group invites for current user
const getGroupInvites = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userPhone = req.user.phone;

  // Build query to find invites by recipient ID or phone number
  const query = {
    status: "pending",
    expiresAt: { $gt: Date.now() },
  };

  if (userPhone) {
    query.$or = [{ recipient: userId }, { phoneNumber: userPhone }];
  } else {
    query.recipient = userId;
  }

  const invites = await GroupInvite.find(query)
    .populate({
      path: "group",
      select: "name description owner members",
      populate: {
        path: "members",
        select: "username",
      },
    })
    .populate("sender", "username email avatar")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, invites, "Group invites fetched successfully"));
});

// Accept group invite
const acceptGroupInvite = asyncHandler(async (req, res) => {
  const { inviteId } = req.params;
  const userId = req.user._id;

  const invite = await GroupInvite.findById(inviteId)
    .populate("group")
    .populate("sender", "username email");

  if (!invite) {
    throw new ApiError(404, "Invite not found");
  }

  if (invite.status !== "pending") {
    throw new ApiError(400, "This invite is no longer pending");
  }

  if (invite.expiresAt < Date.now()) {
    invite.status = "expired";
    await invite.save();
    throw new ApiError(400, "This invite has expired");
  }

  // Check authorization: either recipient matches OR phone number matches
  const isAuthorized =
    (invite.recipient && invite.recipient.toString() === userId.toString()) ||
    (invite.phoneNumber && invite.phoneNumber === req.user.phone);

  if (!isAuthorized) {
    throw new ApiError(403, "You are not authorized to accept this invite");
  }

  const group = invite.group;

  // Check if already a member
  if (group.members.some((m) => m.toString() === userId.toString())) {
    throw new ApiError(400, "You are already a member of this group");
  }

  // Handle contribution if group.pool > 0
  const contributionAmount = group.pool || 0;
  if (contributionAmount > 0) {
    const userWallet = await UserWallet.findOne({ user: userId });
    if (!userWallet) {
      throw new ApiError(404, "User wallet not found. Contribution cannot be deducted.");
    }

    if (userWallet.balance < contributionAmount) {
      throw new ApiError(400, `Insufficient funds in your wallet to cover the group contribution of ₹${contributionAmount}.`);
    }

    const groupWallet = await GroupWallet.findOne({ group: group._id });
    if (!groupWallet) {
      throw new ApiError(404, "Group wallet not found.");
    }

    // Deduct from user's wallet
    userWallet.balance -= contributionAmount;
    await userWallet.save();

    // Update Group Wallet
    groupWallet.balance += contributionAmount;

    // Update user's balance in group wallet
    const memberBalanceIndex = groupWallet.memberBalances.findIndex(
      (mb) => mb.user.toString() === userId.toString(),
    );

    if (memberBalanceIndex > -1) {
      groupWallet.memberBalances[memberBalanceIndex].balance += contributionAmount;
    } else {
      groupWallet.memberBalances.push({
        user: userId,
        balance: contributionAmount,
      });
    }

    groupWallet.transactions.push({
      fromUser: userId,
      amount: contributionAmount,
      type: "DEPOSIT",
      description: "Join group contribution via invite"
    });

    await groupWallet.save();

    // Sync group total pool if necessary (though it's already at group.pool)
    // Actually, group.pool in our current schema seems to track the TOTAL balance.
    // In createGroup we set group.pool to the initial value and groupWallet.balance to pool.
    // So if a new member joins, the pool should INCREASE.
    group.pool += contributionAmount;

    // Create Transaction Record
    await Transaction.create({
      user: userId,
      wallet: userWallet._id,
      intentId: `GROUP_INVITE_ACCEPT_${group._id}_${Date.now()}`,
      type: "DEPOSIT",
      amount: contributionAmount,
      currency: userWallet.currency || "INR",
      status: "COMPLETED",
      paymentStatus: "SUCCESS"
    });
  }

  // Add user to group
  group.members.push(userId);
  await group.save();

  // Update invite status
  invite.status = "accepted";
  invite.recipient = userId; // In case it was a phone invite
  await invite.save();

  // Emit Socket.IO event
  try {
    const io = getIO();
    io.to(group._id.toString()).emit("memberJoined", {
      groupId: group._id,
      user: {
        _id: userId,
        username: req.user.username,
        email: req.user.email,
      },
    });
  } catch (error) {
    console.error("Socket emit failed:", error);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, group, "Group invite accepted successfully"));
});

// Reject group invite
const rejectGroupInvite = asyncHandler(async (req, res) => {
  const { inviteId } = req.params;
  const userId = req.user._id;

  const invite = await GroupInvite.findById(inviteId);

  if (!invite) {
    throw new ApiError(404, "Invite not found");
  }

  if (invite.recipient && invite.recipient.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to reject this invite");
  }

  if (invite.status !== "pending") {
    throw new ApiError(400, "This invite is no longer pending");
  }

  invite.status = "rejected";
  await invite.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Group invite rejected"));
});

// Accept group invite via token (for WhatsApp/phone invites)
const acceptGroupInviteByToken = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const userId = req.user._id;

  const invite = await GroupInvite.findValidInvite(token);

  if (!invite) {
    throw new ApiError(404, "Invalid or expired invite");
  }

  const group = await Group.findById(invite.group._id);
  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  // Check if already a member
  if (group.members.some((m) => m.toString() === userId.toString())) {
    throw new ApiError(400, "You are already a member of this group");
  }

  // Handle contribution if group.pool > 0
  const contributionAmount = group.pool || 0;
  if (contributionAmount > 0) {
    const userWallet = await UserWallet.findOne({ user: userId });
    if (!userWallet) {
      throw new ApiError(404, "User wallet not found. Contribution cannot be deducted.");
    }

    if (userWallet.balance < contributionAmount) {
      throw new ApiError(400, `Insufficient funds in your wallet to cover the group contribution of ₹${contributionAmount}.`);
    }

    const groupWallet = await GroupWallet.findOne({ group: group._id });
    if (!groupWallet) {
      throw new ApiError(404, "Group wallet not found.");
    }

    // Deduct from user's wallet
    userWallet.balance -= contributionAmount;
    await userWallet.save();

    // Update Group Wallet
    groupWallet.balance += contributionAmount;

    // Update user's balance in group wallet
    const memberBalanceIndex = groupWallet.memberBalances.findIndex(
      (mb) => mb.user.toString() === userId.toString(),
    );

    if (memberBalanceIndex > -1) {
      groupWallet.memberBalances[memberBalanceIndex].balance += contributionAmount;
    } else {
      groupWallet.memberBalances.push({
        user: userId,
        balance: contributionAmount,
      });
    }

    groupWallet.transactions.push({
      fromUser: userId,
      amount: contributionAmount,
      type: "DEPOSIT",
      description: "Join group contribution via token"
    });

    await groupWallet.save();

    // Update group total pool
    group.pool += contributionAmount;

    // Create Transaction Record
    await Transaction.create({
      user: userId,
      wallet: userWallet._id,
      intentId: `GROUP_TOKEN_ACCEPT_${group._id}_${Date.now()}`,
      type: "DEPOSIT",
      amount: contributionAmount,
      currency: userWallet.currency || "INR",
      status: "COMPLETED",
      paymentStatus: "SUCCESS"
    });
  }

  // Add user to group
  group.members.push(userId);
  await group.save();

  // Update invite
  invite.status = "accepted";
  invite.recipient = userId;
  await invite.save();

  return res
    .status(200)
    .json(new ApiResponse(200, group, "Successfully joined the group"));
});

const getGroupTransactions = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;

  // Verify user is member of group
  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  const isMember =
    group.members.some((m) => m.toString() === userId.toString()) ||
    group.owner.toString() === userId.toString();

  if (!isMember) {
    throw new ApiError(403, "You are not a member of this group");
  }

  // Get transactions for this group
  const groupWallet = await GroupWallet.findOne({ group: groupId }).populate({
    path: "transactions.fromUser",
    select: "username email",
  });

  if (!groupWallet) {
    return res
      .status(200)
      .json(new ApiResponse(200, { transactions: [] }, "No wallet found"));
  }

  // Get payment intent transactions (PENDING deposits waiting for confirmation)
  const pendingIntentTransactions = await Transaction.find({
    wallet: groupWallet._id,
    status: "PENDING",
  })
    .populate("user", "username email")
    .sort({ createdAt: -1 });

  // Get all wallet transactions (deposits, withdrawals, group payments)
  const walletTransactions = groupWallet.transactions.map((tx) => ({
    _id: tx._id,
    type: tx.type,
    amount: tx.amount,
    fromUser: tx.fromUser,
    date: tx.date,
    description: tx.description,
    status: "COMPLETED",
  }));

  // Combine both types of transactions
  const allTransactions = [
    ...pendingIntentTransactions.map((tx) => ({
      _id: tx._id,
      intentId: tx.intentId,
      type: tx.type,
      amount: tx.amount,
      fromUser: tx.user,
      date: tx.createdAt,
      status: tx.status,
    })),
    ...walletTransactions,
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { transactions: allTransactions },
        "Transactions fetched successfully",
      ),
    );
});


/**
 * Step 2 of a gateway-funded group deposit: verify Razorpay's signature, then
 * credit the member's share.
 *
 * The credited amount is read from our own PENDING row rather than the request
 * body, and claiming that row atomically is what stops one payment being
 * redeemed twice.
 */
const completeGroupDeposit = asyncHandler(async (req, res) => {
  const { groupId, intentId } = req.params;
  const { razorpay_payment_id, razorpay_signature } = req.body;
  const userId = req.user._id;

  if (!razorpay_payment_id || !razorpay_signature) {
    throw new ApiError(400, "Missing Razorpay verification data");
  }

  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, "Group not found");

  assertMember(group, userId);

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(intentId + "|" + razorpay_payment_id)
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(razorpay_signature);

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new ApiError(400, "Invalid payment signature");
  }

  const tx = await Transaction.findOneAndUpdate(
    { intentId, user: userId, scope: "GROUP", status: "PENDING" },
    {
      $set: {
        status: "COMPLETED",
        paymentStatus: "SUCCESS",
        proofHash: razorpay_payment_id,
      },
    },
    { new: true }
  );

  if (!tx) {
    throw new ApiError(404, "Pending transaction not found or already verified");
  }

  const groupWallet = await creditGroupMember(groupId, userId, tx.amount, {
    fromUser: userId,
    amount: tx.amount,
    type: "DEPOSIT",
    description: "Card / UPI deposit",
  });

  // Time-locked groups stage incoming money separately until the unlock date.
  const update = { $set: { pool: groupWallet.balance } };
  if (group.releaseType === "time_locked") {
    update.$inc = { pendingFunds: -tx.amount };
  }
  await Group.findByIdAndUpdate(groupId, update);

  try {
    getIO().to(groupId).emit("fundsAdded", {
      groupId,
      addedBy: userId,
      amount: tx.amount,
      newWalletBalance: groupWallet.balance,
    });
  } catch (error) {
    console.error("Socket emit failed:", error.message);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { transaction: tx, groupBalance: groupWallet.balance },
      "Payment verified successfully"
    )
  );
});

const cancelGroupDeposit = asyncHandler(async (req, res) => {
  const { groupId, intentId } = req.params;
  const userId = req.user._id;

  const tx = await Transaction.findOneAndUpdate(
    { intentId, user: userId, scope: "GROUP", status: "PENDING" },
    { $set: { status: "FAILED", paymentStatus: "CANCELLED" } },
    { new: true }
  );

  if (!tx) throw new ApiError(404, "Pending transaction not found");

  const group = await Group.findById(groupId);
  if (group && group.releaseType === "time_locked") {
    await Group.findByIdAndUpdate(groupId, {
      $inc: { pendingFunds: -tx.amount },
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Deposit cancelled successfully"));
});

/** Step 1: create the Razorpay order and the PENDING row it will settle. */
const groupPaymentIntent = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const amount = normalizeAmount(req.body.amount, "Amount");
  const userId = req.user._id;

  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, "Group not found");

  // Missing before: anyone who knew a group id could open an order against it.
  assertMember(group, userId);

  const groupWallet = await GroupWallet.findOne({ group: groupId });
  if (!groupWallet) throw new ApiError(404, "Group wallet not found");

  const order = await razorpayInstance.orders.create({
    amount: Math.round(amount * 100),
    currency: "INR",
    receipt: "grp_" + groupId.slice(-6) + "_" + Date.now(),
  });

  await Transaction.create({
    user: userId,
    wallet: groupWallet._id,
    scope: "GROUP",
    intentId: order.id,
    type: "GROUP_DEPOSIT",
    amount,
    currency: "INR",
    status: "PENDING",
    description: "Deposit to group " + group.name,
  });

  if (group.releaseType === "time_locked") {
    await Group.findByIdAndUpdate(groupId, { $inc: { pendingFunds: amount } });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { order, intentId: order.id }, "Order created"));
});


/** Leaving refunds whatever of the member's share is left in the group. */
const leaveGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;

  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, "Group not found");

  if (group.owner.toString() === userId.toString()) {
    throw new ApiError(
      403,
      "The group owner cannot leave. Transfer ownership or delete the group instead."
    );
  }

  const isMember = group.members.some((m) => m.toString() === userId.toString());
  if (!isMember) throw new ApiError(400, "You are not a member of this group");

  assertUnlocked(group);

  const groupWallet = await GroupWallet.findOne({ group: groupId });
  const refund = groupWallet ? getMemberShare(groupWallet, userId) : 0;

  let balance = groupWallet ? groupWallet.balance : 0;

  if (refund > 0) {
    const updated = await debitGroupMember(groupId, userId, refund, {
      fromUser: userId,
      amount: refund,
      type: "WITHDRAWAL",
      description: "Refund on leaving the group",
    });
    balance = updated.balance;

    const userWallet = await creditUserWallet(userId, refund);

    await Transaction.create({
      user: userId,
      wallet: userWallet._id,
      scope: "USER",
      intentId: "GROUP_LEAVE_" + groupId + "_" + Date.now(),
      type: "REFUND",
      amount: refund,
      currency: userWallet.currency || "INR",
      status: "COMPLETED",
      paymentStatus: "SUCCESS",
      description: "Refund on leaving group " + group.name,
    });
  }

  await Group.findByIdAndUpdate(groupId, {
    $pull: { members: userId },
    $set: { pool: balance },
  });

  if (groupWallet) {
    await GroupWallet.findOneAndUpdate(
      { group: groupId },
      { $pull: { memberBalances: { user: userId } } }
    );
  }

  try {
    getIO().to(groupId).emit("memberLeft", { groupId, userId });
  } catch (error) {
    console.error("Socket emit failed:", error.message);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { refunded: refund }, "You have left the group"));
});

const getGroupPendingInvites = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;

  // Verify user is member or owner of group
  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  const isMemberOrOwner =
    group.members.some((m) => m.toString() === userId.toString()) ||
    group.owner.toString() === userId.toString();

  if (!isMemberOrOwner) {
    throw new ApiError(403, "You are not authorized to view group invites");
  }

  // Get all pending invites for this group
  const invites = await GroupInvite.find({
    group: groupId,
    status: "pending",
    expiresAt: { $gt: Date.now() },
  })
    .populate("sender", "username email")
    .populate("recipient", "username email")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { invites },
        "Pending invites fetched successfully",
      ),
    );
});

export {
  createGroup,
  logExpense,
  addRule,
  removeRule,
  addFundsToGroup,
  joinGroup,
  getGroupDetails,
  sendMessage,
  getMessages,
  getUserGroups,
  sendGroupInviteToFriend,
  sendGroupInviteViaWhatsApp,
  getGroupInvites,
  acceptGroupInvite,
  rejectGroupInvite,
  acceptGroupInviteByToken,
  getGroupTransactions,
  completeGroupDeposit,
  cancelGroupDeposit,
  groupPaymentIntent,
  leaveGroup,
  getGroupPendingInvites,
};
