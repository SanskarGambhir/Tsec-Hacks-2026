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
import axios from "axios";

const createGroup = asyncHandler(async (req, res) => {
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

  const group = await Group.create({
    name,
    description: description || "",
    rules,
    ruleType,
    releaseType: releaseType || "instant",
    unlockDate: unlockDate || null,
    isLocked: isLocked || false,
    milestones: milestones || [],
    pool: pool || 0,
    owner: req.user._id,
    members: [req.user._id], // Owner is automatically a member
  });

  const createdGroup = await Group.findById(group._id);

  if (!createdGroup) {
    throw new ApiError(500, "Something went wrong while creating the group");
  }

  // Handle pool deduction from owner's wallet if pool > 0
  let ownerWallet = null;
  if (pool && pool > 0) {
    ownerWallet = await UserWallet.findOne({ user: req.user._id });
    if (!ownerWallet) {
      // Rollback group creation if wallet not found but pool is required
      await Group.findByIdAndDelete(group._id);
      throw new ApiError(404, "Owner wallet not found. Pool amount cannot be deducted.");
    }

    if (ownerWallet.balance < pool) {
      // Rollback group creation if insufficient funds
      await Group.findByIdAndDelete(group._id);
      throw new ApiError(400, "Insufficient funds in your wallet to cover the initial pool amount.");
    }

    // Deduct from owner's wallet
    ownerWallet.balance -= pool;
    await ownerWallet.save();
  }

  // Create Group Wallet
  const groupWallet = await GroupWallet.create({
    group: createdGroup._id,
    balance: pool || 0, // Initialize with pool amount if provided
    currency: "INR",
    memberBalances: pool > 0 ? [{
      user: req.user._id,
      balance: pool
    }] : [],
    transactions: pool > 0 ? [{
      fromUser: req.user._id,
      amount: pool,
      type: "DEPOSIT",
      description: "Initial pool contribution"
    }] : []
  });

  // Create Transaction Record for owner's deduction
  if (pool && pool > 0 && ownerWallet) {
    await Transaction.create({
      user: req.user._id,
      wallet: ownerWallet._id,
      intentId: `GROUP_INIT_${createdGroup._id}`,
      type: "DEPOSIT", // Or a new type like "GROUP_INITIAL_POOL"
      amount: pool,
      currency: ownerWallet.currency || "INR",
      status: "COMPLETED",
      paymentStatus: "SUCCESS"
    });
  }

  // Link Wallet to Group
  createdGroup.wallet = groupWallet._id;
  await createdGroup.save();

  return res
    .status(201)
    .json(new ApiResponse(201, createdGroup, "Group created successfully"));
});

const addFundsToGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { amount, intentId } = req.body;

  if (!amount || amount <= 0) {
    throw new ApiError(400, "Valid amount is required");
  }

  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  // Get Group Wallet
  const groupWallet = await GroupWallet.findOne({ group: groupId });
  if (!groupWallet) {
    throw new ApiError(404, "Group wallet not found");
  }

  // If intentId is provided, create a Transaction record for tracking
  if (intentId) {
    const existingTransaction = await Transaction.findOne({ intentId });

    if (!existingTransaction) {
      await Transaction.create({
        user: req.user._id,
        wallet: groupWallet._id,
        intentId: intentId,
        type: "DEPOSIT",
        amount: amount,
        currency: "USDC",
        status: "PENDING",
      });

      // For time-locked groups, add to pending funds instead of pool
      if (group.releaseType === "time_locked") {
        group.pendingFunds = (group.pendingFunds || 0) + amount;
        await group.save();
      }
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          groupPool: group.pool,
          groupWalletBalance: groupWallet.balance,
          pendingFunds: group.pendingFunds,
        },
        "Payment intent created, awaiting confirmation",
      ),
    );
  }

  // Original flow for instant payments (no intentId)
  // 1. Get User Wallet
  const userWallet = await UserWallet.findOne({ user: req.user._id });
  if (!userWallet) {
    throw new ApiError(404, "User wallet not found");
  }

  // 2. Check Balance
  if (userWallet.balance < amount) {
    throw new ApiError(400, "Insufficient funds in user wallet");
  }

  // 4. Perform Transaction
  userWallet.balance -= amount;

  // Update Group Wallet Total Balance
  groupWallet.balance += amount;

  // Update Specific User's Mini-Pool in Group Wallet
  const memberBalanceIndex = groupWallet.memberBalances.findIndex(
    (mb) => mb.user.toString() === req.user._id.toString(),
  );

  if (memberBalanceIndex > -1) {
    groupWallet.memberBalances[memberBalanceIndex].balance += amount;
  } else {
    groupWallet.memberBalances.push({
      user: req.user._id,
      balance: amount,
    });
  }

  groupWallet.transactions.push({
    fromUser: req.user._id,
    amount,
    type: "DEPOSIT",
  });

  // Sync group pool for display/legacy purposes
  // group.pool += amount;

  await userWallet.save();
  await groupWallet.save();
  await group.save();

  // Emit real-time update
  try {
    const io = getIO();
    io.to(groupId).emit("fundsAdded", {
      groupId,
      addedBy: req.user._id,
      amount,
      newPoolBalance: group.pool,
      newWalletBalance: groupWallet.balance,
    });
    console.log("Socket emit successful");
  } catch (error) {
    console.error("Socket emit failed:", error);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { groupPool: group.pool, groupWalletBalance: groupWallet.balance },
        "Funds added successfully",
      ),
    );
});

const logExpense = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { amount, description } = req.body;

  if (!amount || !description) {
    throw new ApiError(400, "Amount and description are required");
  }

  const group = await Group.findById(groupId);

  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  // Check if the user is a member or owner
  const isMember =
    group.members.includes(req.user._id) ||
    group.owner.toString() === req.user._id.toString();

  if (!isMember) {
    throw new ApiError(403, "You are not a member of this group");
  }

  const groupWallet = await GroupWallet.findOne({ group: groupId });
  if (!groupWallet) {
    throw new ApiError(404, "Group wallet not found");
  }

  // Calculate split amount
  const numberOfMembers = group.members.length;
  if (numberOfMembers === 0) {
    throw new ApiError(400, "Group has no members to split the expense");
  }
  const splitAmount = amount / numberOfMembers;

  // Verify if ALL members have enough balance in their mini-pools
  // Note: We need to handle cases where a member might not have an entry in memberBalances yet (effectively 0 balance)
  for (const memberId of group.members) {
    const memberBalanceEntry = groupWallet.memberBalances.find(
      (mb) => mb.user.toString() === memberId.toString(),
    );
    const currentBalance = memberBalanceEntry ? memberBalanceEntry.balance : 0;

    if (currentBalance < splitAmount) {
      throw new ApiError(
        400,
        `Insufficient funds for user ${memberId}. Each member needs ${splitAmount}`,
      );
    }
  }

  // Deduct from each member's mini-pool
  for (const memberId of group.members) {
    const memberBalanceEntry = groupWallet.memberBalances.find(
      (mb) => mb.user.toString() === memberId.toString(),
    );
    // We already verified existence and balance above, so strictly speaking it should be there,
    // but safe to check if we created it (though we expect it to exist if balance > 0)
    if (memberBalanceEntry) {
      memberBalanceEntry.balance -= splitAmount;
    }
  }

  // Deduct from pool and add to expenses
  const expense = {
    amount,
    description,
    spentBy: req.user._id,
    date: new Date(),
  };

  group.pool -= amount;
  group.expenses.push(expense);

  // Update Wallet Total Balance
  groupWallet.balance -= amount;
  groupWallet.transactions.push({
    fromUser: req.user._id, // Recording who spent it essentially
    amount,
    type: "WITHDRAWAL", // Or specific expense type if needed
  });

  await group.save();
  await groupWallet.save();

  // Emit real-time update
  try {
    const io = getIO();
    io.to(groupId).emit("expenseLogged", {
      groupId,
      pool: group.pool,
      walletBalance: groupWallet.balance,
      expense,
    });
  } catch (error) {
    console.error("Socket emit failed:", error);
    // Continue execution, don't fail the request
  }

  return res
    .status(200)
    .json(new ApiResponse(200, group, "Expense logged successfully"));
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

const joinGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { amount } = req.body;

  const group = await Group.findById(groupId)
    .populate("owner", "username email")
    .populate("members", "username email");

  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  // Check if user is already a member
  const isAlreadyMember = group.members.some(
    (member) => member._id.toString() === req.user._id.toString(),
  );

  if (isAlreadyMember) {
    throw new ApiError(400, "User is already a member of this group");
  }

  // Handle pool contribution if amount > 0
  let userWallet = null;
  const groupWallet = await GroupWallet.findOne({ group: groupId });

  if (amount && amount > 0) {
    userWallet = await UserWallet.findOne({ user: req.user._id });
    if (!userWallet) {
      throw new ApiError(404, "User wallet not found. Contribution cannot be deducted.");
    }

    if (userWallet.balance < amount) {
      throw new ApiError(400, "Insufficient funds in your wallet to cover the group contribution.");
    }

    if (!groupWallet) {
      throw new ApiError(404, "Group wallet not found.");
    }

    // Deduct from user's wallet
    userWallet.balance -= amount;
    await userWallet.save();

    // Update Group Wallet
    groupWallet.balance += amount;

    // Update user's balance in group wallet
    const memberBalanceIndex = groupWallet.memberBalances.findIndex(
      (mb) => mb.user.toString() === req.user._id.toString(),
    );

    if (memberBalanceIndex > -1) {
      groupWallet.memberBalances[memberBalanceIndex].balance += amount;
    } else {
      groupWallet.memberBalances.push({
        user: req.user._id,
        balance: amount,
      });
    }

    groupWallet.transactions.push({
      fromUser: req.user._id,
      amount,
      type: "DEPOSIT",
      description: "Join group contribution"
    });

    await groupWallet.save();

    // Update group total pool
    group.pool += amount;

    // Create Transaction Record
    await Transaction.create({
      user: req.user._id,
      wallet: userWallet._id,
      intentId: `GROUP_JOIN_${group._id}_${Date.now()}`,
      type: "DEPOSIT",
      amount: amount,
      currency: userWallet.currency || "INR",
      status: "COMPLETED",
      paymentStatus: "SUCCESS"
    });
  }

  // Add user to the group members
  group.members.push(req.user._id);
  await group.save();

  // Get updated group details with populated data
  const updatedGroup = await Group.findById(groupId)
    .populate("owner", "username email")
    .populate("members", "username email");

  console.log("Group joined:", updatedGroup);

  // Prepare response with group details
  const groupDetails = {
    _id: updatedGroup._id,
    name: updatedGroup.name,
    description: updatedGroup.description,
    pool: updatedGroup.pool,
    rules: updatedGroup.rules,
    owner: {
      _id: updatedGroup.owner._id,
      username: updatedGroup.owner.username,
      email: updatedGroup.owner.email,
    },
    members: updatedGroup.members.map((member) => ({
      _id: member._id,
      username: member.username,
      email: member.email,
    })),
    expenses: updatedGroup.expenses,
    createdAt: updatedGroup.createdAt,
    updatedAt: updatedGroup.updatedAt,
    wallet: groupWallet
      ? {
        balance: groupWallet.balance,
        currency: groupWallet.currency,
        transactions: groupWallet.transactions,
      }
      : null,
  };

  // Emit real-time update to notify other members
  try {
    const io = getIO();
    io.to(groupId).emit("memberJoined", {
      groupId,
      user: {
        _id: req.user._id,
        username: req.user.username, // assuming user object has username
        email: req.user.email,
      },
    });
  } catch (error) {
    console.error("Socket emit failed:", error);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, groupDetails, "Successfully joined the group"));
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

  if (!content || content.trim().length === 0) {
    throw new ApiError(400, "Message content is required");
  }

  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  // Check if the user is a member of the group
  const isMember =
    group.members.some(
      (member) => member.toString() === req.user._id.toString(),
    ) || group.owner.toString() === req.user._id.toString();

  if (!isMember) {
    throw new ApiError(403, "You are not a member of this group");
  }

  // Create and add the message to the group
  const message = {
    content: content.trim(),
    sender: req.user._id,
  };

  group.messages.push(message);
  await group.save();

  // Populate the sender information for the response
  const populatedGroup = await Group.findById(groupId)
    .populate("owner", "username email")
    .populate("members", "username email")
    .populate({
      path: "messages",
      populate: {
        path: "sender",
        select: "username email",
      },
    })
    .populate("wallet");

  // Emit real-time update
  try {
    const io = getIO();
    io.to(groupId).emit("newMessage", {
      groupId,
      message: {
        content: message.content,
        sender: {
          _id: req.user._id,
          username: req.user.username,
          email: req.user.email,
        },
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error("Socket emit failed:", error);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        message: populatedGroup.messages[populatedGroup.messages.length - 1],
      },
      "Message sent successfully",
    ),
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

const checkGroupPayments = asyncHandler(async (req, res) => {
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

  const groupWallet = await GroupWallet.findOne({ group: groupId });
  if (!groupWallet) {
    return res
      .status(200)
      .json(new ApiResponse(200, { updated: [], count: 0 }, "No wallet found"));
  }

  const pending = await Transaction.find({
    user: userId,
    wallet: groupWallet._id,
    status: "PENDING",
  });

  const updated = [];

  for (const tx of pending) {
    try {
      const response = await axios.get(
        `https://api.fmm.finternetlab.io/v1/payment-intents/${tx.intentId}`,
        {
          headers: {
            "X-API-Key": "sk_hackathon_5d3da8cd5d11aa58990e3edd273b1dd6",
          },
        },
      );

      const apiStatus = response.data.data?.status;

      if (apiStatus === "COMPLETED" || apiStatus === "SUCCESS") {
        tx.status = "COMPLETED";
        tx.paymentStatus = apiStatus;
        await tx.save();

        // Update group wallet balance
        groupWallet.balance += tx.amount;
        await groupWallet.save();

        // Update group pool and move from pending to pool
        group.pool += tx.amount;
        if (group.pendingFunds >= tx.amount) {
          group.pendingFunds -= tx.amount;
        }
        await group.save();

        updated.push(tx);
      }
    } catch (error) {
      console.error(`Failed to check intent ${tx.intentId}:`, error.message);
    }
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { updated, count: updated.length },
        "Payment check completed",
      ),
    );
});

const completeGroupDeposit = asyncHandler(async (req, res) => {
  const { groupId, intentId } = req.params;
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

  const groupWallet = await GroupWallet.findOne({ group: groupId });
  if (!groupWallet) {
    throw new ApiError(404, "Group wallet not found");
  }

  const tx = await Transaction.findOne({
    user: userId,
    wallet: groupWallet._id,
    intentId,
    status: "PENDING",
  });

  if (!tx) {
    throw new ApiError(404, "Pending transaction not found");
  }

  try {
    // Submit delivery proof to Finternet API
    const proofResponse = await axios.post(
      `https://api.fmm.finternetlab.io/v1/payment-intents/${intentId}/delivery-proof`,
      {
        proof: {
          type: "DELIVERY_CONFIRMATION",
          hash: `proof_${Date.now()}`,
          metadata: {
            groupId: groupId,
            userId: userId.toString(),
          },
        },
      },
      {
        headers: {
          "X-API-Key": "sk_hackathon_5d3da8cd5d11aa58990e3edd273b1dd6",
          "Content-Type": "application/json",
        },
      },
    );

    tx.proofHash =
      proofResponse.data.data?.proof?.hash || `proof_${Date.now()}`;
    await tx.save();

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { transaction: tx },
          "Proof submitted successfully",
        ),
      );
  } catch (error) {
    console.error(
      "Proof submission error:",
      error.response?.data || error.message,
    );
    throw new ApiError(500, "Failed to submit delivery proof");
  }
});

// Leave group
const leaveGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;

  // Check if group exists
  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  // Check if user is the owner
  if (group.owner.toString() === userId.toString()) {
    throw new ApiError(
      403,
      "Group owner cannot leave the group. Please transfer ownership or delete the group.",
    );
  }

  // Check if user is a member
  const isMember = group.members.some(
    (m) => m.toString() === userId.toString(),
  );
  if (!isMember) {
    throw new ApiError(400, "You are not a member of this group");
  }

  // Remove user from members
  group.members = group.members.filter(
    (m) => m.toString() !== userId.toString(),
  );
  await group.save();

  // Emit socket event for member left
  const io = getIO();
  if (io) {
    io.to(groupId).emit("memberLeft", {
      groupId,
      user: req.user,
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Successfully left the group"));
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
  addFundsToGroup,
  joinGroup,
  getGroupDetails,
  sendMessage,
  getUserGroups,
  sendGroupInviteToFriend,
  sendGroupInviteViaWhatsApp,
  getGroupInvites,
  acceptGroupInvite,
  rejectGroupInvite,
  acceptGroupInviteByToken,
  getGroupTransactions,
  checkGroupPayments,
  completeGroupDeposit,
  leaveGroup,
  getGroupPendingInvites,
};
