import { Group } from "../models/group.models.js";
import { GroupWallet } from "../models/groupWallet.models.js";
import { UserWallet } from "../models/wallet.models.js";
import { GroupInvite } from "../models/groupInvite.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getIO } from "../socket.js";
import { sendWhatsApp } from "../utils/twilio.js";

const createGroup = asyncHandler(async (req, res) => {
  const { name, description, rules, pool, ruleType } = req.body;

  if (!name || !rules || !Array.isArray(rules) || rules.length === 0) {
    throw new ApiError(400, "Name and rules (array) are required fields");
  }

  // Check if any rule specifies the group type
  const hasGroupType = rules.some(rule =>
    rule.ruleType === 'pool' || rule.ruleType === 'regular_split'
  );

  // If no group type is specified, default to 'pool'
  if (!hasGroupType) {
    rules.push({
      ruleType: 'pool',
      ruleValue: 'Pool-based group',
      description: 'Money is collected in a shared pool'
    });
  }

  const group = await Group.create({
    name,
    description: description || "",
    rules,
    ruleType,
    pool: pool || 0,
    owner: req.user._id,
    members: [req.user._id] // Owner is automatically a member
  });

  const createdGroup = await Group.findById(group._id);

  if (!createdGroup) {
    throw new ApiError(500, "Something went wrong while creating the group");
  }

  // Create Group Wallet
  const groupWallet = await GroupWallet.create({
    group: createdGroup._id,
    balance: 0, // Initialize with pool amount if provided
    currency: "INR"
  });

  // Link Wallet to Group
  createdGroup.wallet = groupWallet._id;
  await createdGroup.save();

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        createdGroup,
        "Group created successfully"
      )
    );
});

const addFundsToGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    throw new ApiError(400, "Valid amount is required");
  }

  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  // 1. Get User Wallet
  const userWallet = await UserWallet.findOne({ user: req.user._id });
  if (!userWallet) {
    throw new ApiError(404, "User wallet not found");
  }

  // 2. Check Balance
  if (userWallet.balance < amount) {
    throw new ApiError(400, "Insufficient funds in user wallet");
  }

  // 3. Get Group Wallet
  const groupWallet = await GroupWallet.findOne({ group: groupId });
  if (!groupWallet) {
    throw new ApiError(404, "Group wallet not found");
  }

  // 4. Perform Transaction
  userWallet.balance -= amount;

  // Update Group Wallet Total Balance
  groupWallet.balance += amount;

  // Update Specific User's Mini-Pool in Group Wallet
  const memberBalanceIndex = groupWallet.memberBalances.findIndex(
    (mb) => mb.user.toString() === req.user._id.toString()
  );

  if (memberBalanceIndex > -1) {
    groupWallet.memberBalances[memberBalanceIndex].balance += amount;
  } else {
    groupWallet.memberBalances.push({
      user: req.user._id,
      balance: amount
    });
  }

  groupWallet.transactions.push({
    fromUser: req.user._id,
    amount,
    type: "DEPOSIT"
  });

  // Sync group pool for display/legacy purposes
  group.pool += amount;

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
      newWalletBalance: groupWallet.balance
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
        "Funds added successfully"
      )
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
  const isMember = group.members.includes(req.user._id) || group.owner.toString() === req.user._id.toString();

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
      (mb) => mb.user.toString() === memberId.toString()
    );
    const currentBalance = memberBalanceEntry ? memberBalanceEntry.balance : 0;

    if (currentBalance < splitAmount) {
      throw new ApiError(400, `Insufficient funds for user ${memberId}. Each member needs ${splitAmount}`);
    }
  }

  // Deduct from each member's mini-pool
  for (const memberId of group.members) {
    const memberBalanceEntry = groupWallet.memberBalances.find(
      (mb) => mb.user.toString() === memberId.toString()
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
    date: new Date()
  };

  group.pool -= amount;
  group.expenses.push(expense);

  // Update Wallet Total Balance
  groupWallet.balance -= amount;
  groupWallet.transactions.push({
    fromUser: req.user._id, // Recording who spent it essentially
    amount,
    type: "WITHDRAWAL" // Or specific expense type if needed
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
      expense
    });
  } catch (error) {
    console.error("Socket emit failed:", error);
    // Continue execution, don't fail the request
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        group,
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
    description: description || ""
  };

  group.rules.push(newRule);
  await group.save();

  // Emit real-time update
  try {
    const io = getIO();
    io.to(groupId).emit("ruleAdded", {
      groupId,
      rule: newRule
    });
  } catch (error) {
    console.error("Socket emit failed:", error);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        group,
        "Rule added successfully"
      )
    );
});

const joinGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const group = await Group.findById(groupId)
    .populate('owner', 'username email')
    .populate('members', 'username email');

  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  // Check if user is already a member
  const isAlreadyMember = group.members.some(member =>
    member._id.toString() === req.user._id.toString()
  );

  if (isAlreadyMember) {
    throw new ApiError(400, "User is already a member of this group");
  }

  // Add user to the group members
  group.members.push(req.user._id);
  await group.save();

  // Get updated group details with populated data
  const updatedGroup = await Group.findById(groupId)
    .populate('owner', 'username email')
    .populate('members', 'username email');

  // Get group wallet information
  const groupWallet = await GroupWallet.findOne({ group: groupId });

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
      email: updatedGroup.owner.email
    },
    members: updatedGroup.members.map(member => ({
      _id: member._id,
      username: member.username,
      email: member.email
    })),
    expenses: updatedGroup.expenses,
    createdAt: updatedGroup.createdAt,
    updatedAt: updatedGroup.updatedAt,
    wallet: groupWallet ? {
      balance: groupWallet.balance,
      currency: groupWallet.currency,
      transactions: groupWallet.transactions
    } : null
  };

  // Emit real-time update to notify other members
  try {
    const io = getIO();
    io.to(groupId).emit("memberJoined", {
      groupId,
      user: {
        _id: req.user._id,
        username: req.user.username, // assuming user object has username
        email: req.user.email
      }
    });
  } catch (error) {
    console.error("Socket emit failed:", error);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        groupDetails,
        "Successfully joined the group"
      )
    );
});

const getGroupDetails = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const group = await Group.findById(groupId)
    .populate('owner', 'username email')
    .populate('members', 'username email')
    .populate('wallet'); // Populate wallet for detailed info

  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  // Check if the user is a member or owner of the group
  const isMember = group.members.some(member =>
    member._id.toString() === req.user._id.toString()
  ) || group.owner._id.toString() === req.user._id.toString();

  if (!isMember) {
    throw new ApiError(403, "You are not authorized to view this group");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        group,
        "Group details retrieved successfully"
      )
    );
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
  const isMember = group.members.some(member =>
    member.toString() === req.user._id.toString()
  ) || group.owner.toString() === req.user._id.toString();

  if (!isMember) {
    throw new ApiError(403, "You are not a member of this group");
  }

  // Create and add the message to the group
  const message = {
    content: content.trim(),
    sender: req.user._id
  };

  group.messages.push(message);
  await group.save();

  // Populate the sender information for the response
  const populatedGroup = await Group.findById(groupId)
    .populate('owner', 'username email')
    .populate('members', 'username email')
    .populate({
      path: 'messages',
      populate: {
        path: 'sender',
        select: 'username email'
      }
    })
    .populate('wallet');

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
          email: req.user.email
        },
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error("Socket emit failed:", error);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { message: populatedGroup.messages[populatedGroup.messages.length - 1] },
        "Message sent successfully"
      )
    );
});

const getUserGroups = asyncHandler(async (req, res) => {
  // Find all groups where the user is either owner or member
  const groups = await Group.find({
    $or: [
      { owner: req.user._id },
      { members: { $in: [req.user._id] } }
    ]
  })
    .populate('owner', 'username email')
    .populate('members', 'username email')
    .populate('wallet')
    .sort({ updatedAt: -1 }); // Sort by most recently updated

  if (!groups) {
    throw new ApiError(500, "Error fetching user groups");
  }

  // Format the response to match the frontend expectations
  const formattedGroups = groups.map(group => {
    // Calculate user's share or balance if needed
    const userIsOwner = group.owner._id.toString() === req.user._id.toString();
    const userIsMember = group.members.some(member =>
      member._id.toString() === req.user._id.toString()
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
      createdAt: group.createdAt
    };
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        formattedGroups,
        "User groups retrieved successfully"
      )
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

  const isAuthorized = group.owner.toString() === senderId.toString() || 
                      group.members.some(m => m.toString() === senderId.toString());
  
  if (!isAuthorized) {
    throw new ApiError(403, "You are not authorized to invite members to this group");
  }

  // Check if friend exists
  const friend = await User.findById(friendId);
  if (!friend) {
    throw new ApiError(404, "Friend not found");
  }

  // Check if already a member
  if (group.members.some(m => m.toString() === friendId)) {
    throw new ApiError(400, "User is already a member of this group");
  }

  // Check for existing pending invite
  const existingInvite = await GroupInvite.findOne({
    group: groupId,
    recipient: friendId,
    status: "pending",
    expiresAt: { $gt: Date.now() }
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
    inviteType: "friend"
  });

  await invite.populate([
    { path: "group", select: "name description" },
    { path: "sender", select: "username email" }
  ]);

  return res.status(201).json(
    new ApiResponse(201, invite, "Group invite sent successfully")
  );
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

  const isAuthorized = group.owner.toString() === senderId.toString() || 
                      group.members.some(m => m.toString() === senderId.toString());
  
  if (!isAuthorized) {
    throw new ApiError(403, "You are not authorized to invite members to this group");
  }

  // Format phone number
  let formattedPhone = phoneNumber.trim();
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+91' + formattedPhone;
  }

  // Check if phone belongs to existing user
  const existingUser = await User.findOne({ phone: formattedPhone });
  if (existingUser) {
    // Check if already a member
    if (group.members.some(m => m.toString() === existingUser._id.toString())) {
      throw new ApiError(400, "User is already a member of this group");
    }
  }

  // Check for existing pending invite
  const existingInvite = await GroupInvite.findOne({
    group: groupId,
    phoneNumber: formattedPhone,
    status: "pending",
    expiresAt: { $gt: Date.now() }
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
    recipient: existingUser?._id
  });

  // Create invite link
  const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/group-invite/${token}`;

  // Send WhatsApp message
  try {
    await sendWhatsApp(
      formattedPhone,
      `${req.user.username} invited you to join "${group.name}" group on Cooper! Click here to accept: ${inviteLink}`
    );
  } catch (error) {
    await invite.deleteOne();
    throw new ApiError(500, `Failed to send WhatsApp: ${error.message}`);
  }

  return res.status(201).json(
    new ApiResponse(201, { inviteLink, phoneNumber: formattedPhone }, "WhatsApp group invite sent successfully")
  );
});

// Get pending group invites for current user
const getGroupInvites = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userPhone = req.user.phone;

  // Build query to find invites by recipient ID or phone number
  const query = {
    status: "pending",
    expiresAt: { $gt: Date.now() }
  };

  if (userPhone) {
    query.$or = [
      { recipient: userId },
      { phoneNumber: userPhone }
    ];
  } else {
    query.recipient = userId;
  }

  const invites = await GroupInvite.find(query)
    .populate({
      path: "group",
      select: "name description owner members",
      populate: {
        path: "members",
        select: "username"
      }
    })
    .populate("sender", "username email avatar")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, invites, "Group invites fetched successfully")
  );
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
  if (group.members.some(m => m.toString() === userId.toString())) {
    throw new ApiError(400, "You are already a member of this group");
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
        email: req.user.email
      }
    });
  } catch (error) {
    console.error("Socket emit failed:", error);
  }

  return res.status(200).json(
    new ApiResponse(200, group, "Group invite accepted successfully")
  );
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

  return res.status(200).json(
    new ApiResponse(200, {}, "Group invite rejected")
  );
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
  if (group.members.some(m => m.toString() === userId.toString())) {
    throw new ApiError(400, "You are already a member of this group");
  }

  // Add user to group
  group.members.push(userId);
  await group.save();

  // Update invite
  invite.status = "accepted";
  invite.recipient = userId;
  await invite.save();

  return res.status(200).json(
    new ApiResponse(200, group, "Successfully joined the group")
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
  acceptGroupInviteByToken
};