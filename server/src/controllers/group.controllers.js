import { Group } from "../models/group.models.js";
import { GroupWallet } from "../models/groupWallet.models.js";
import { UserWallet } from "../models/wallet.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getIO } from "../socket.js";

const createGroup = asyncHandler(async (req, res) => {
  const { name, description, rules, pool } = req.body;

  if (!name || !rules || !Array.isArray(rules) || rules.length === 0) {
    throw new ApiError(400, "Name and rules (array) are required fields");
  }

  const group = await Group.create({
    name,
    description: description || "",
    rules,
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
  groupWallet.balance += amount;

  groupWallet.transactions.push({
    fromUser: req.user._id,
    amount,
    type: "DEPOSIT"
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

  if (groupWallet.balance < amount) {
    throw new ApiError(400, "Insufficient funds in group wallet");
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

  // Update Wallet
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

export { createGroup, logExpense, addRule, addFundsToGroup, joinGroup, getGroupDetails };
