import { Group } from "../models/group.models.js";
import { GroupWallet } from "../models/groupWallet.models.js";
import { Transaction } from "../models/transactions.models.js";
import { Friend } from "../models/friend.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get user's activity feed (all activities from groups they're in)
const getActivityFeed = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { limit = 50, page = 1, filter = "all" } = req.query;

  try {
    // Get all groups where user is a member
    const groups = await Group.find({
      $or: [{ owner: userId }, { members: userId }],
    })
      .select("_id name expenses messages owner members")
      .populate("expenses.spentBy", "username email avatar")
      .populate("messages.sender", "username email avatar")
      .lean();

    let activities = [];

    if (groups && groups.length > 0) {
      const groupIds = groups.map((g) => g._id);

      // Process each group
      for (const group of groups) {
        // Add expenses
        if (group.expenses && Array.isArray(group.expenses)) {
          group.expenses.forEach((expense, idx) => {
            activities.push({
              _id: `${group._id}-expense-${idx}`,
              type: "expense",
              title: "Expense Added",
              description: expense.description || "Expense logged",
              amount: expense.amount,
              groupId: group._id,
              groupName: group.name,
              user: expense.spentBy || { username: "Unknown", email: "" },
              date: expense.date || new Date(),
              createdAt: expense.date || new Date(),
            });
          });
        }

        // Add messages
        if (group.messages && Array.isArray(group.messages)) {
          group.messages.forEach((message, idx) => {
            activities.push({
              _id: `${group._id}-message-${idx}`,
              type: "message",
              title: "Message",
              description: message.content || "New message",
              groupId: group._id,
              groupName: group.name,
              user: message.sender || { username: "Unknown", email: "" },
              date: message.timestamp || new Date(),
              createdAt: message.timestamp || new Date(),
            });
          });
        }
      }

      // Get wallet transactions for these groups
      const wallets = await GroupWallet.find({ group: { $in: groupIds } })
        .populate("transactions.fromUser", "username email avatar")
        .lean();

      for (const wallet of wallets) {
        const group = groups.find((g) => g._id.toString() === wallet.group.toString());
        if (wallet.transactions && Array.isArray(wallet.transactions)) {
          wallet.transactions.forEach((tx, idx) => {
            activities.push({
              _id: `${wallet._id}-tx-${idx}`,
              type: tx.type === "deposit" ? "payment" : "settlement",
              title: tx.type === "deposit" ? "Pool Contribution" : "Settlement",
              description: `${tx.type} of $${tx.amount}`,
              amount: tx.amount,
              groupId: wallet.group,
              groupName: group?.name || "Unknown Group",
              user: tx.fromUser || { username: "Unknown", email: "" },
              date: tx.date || new Date(),
              createdAt: tx.date || new Date(),
            });
          });
        }
      }
    }

    // Filter by type
    let filteredActivities = activities;
    if (filter && filter !== "all") {
      const typeMap = {
        expenses: "expense",
        payments: "payment",
        members: "member",
        pool: "payment",
        messages: "message",
      };
      const typeFilter = typeMap[filter];
      if (typeFilter) {
        filteredActivities = filteredActivities.filter(
          (a) => a.type === typeFilter
        );
      }
    }

    // Sort by date (newest first)
    filteredActivities.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    // Pagination
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const startIdx = (pageNum - 1) * limitNum;
    const paginatedActivities = filteredActivities.slice(
      startIdx,
      startIdx + limitNum
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          activities: paginatedActivities,
          total: filteredActivities.length,
          page: pageNum,
          limit: limitNum,
        },
        "Activities retrieved successfully"
      )
    );
  } catch (error) {
    console.error("Error in getActivityFeed:", error);
    throw new ApiError(500, "Failed to fetch activities");
  }
});

// Get activities for a specific group
const getGroupActivities = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;
  const { limit = 50, page = 1 } = req.query;

  // Verify user is member of group
  const group = await Group.findById(groupId)
    .populate("expenses.spentBy", "username email avatar")
    .populate("messages.sender", "username email avatar")
    .lean();

  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  const isMember =
    group.members.some((m) => m.toString() === userId.toString()) ||
    group.owner.toString() === userId.toString();

  if (!isMember) {
    throw new ApiError(403, "You are not a member of this group");
  }

  let activities = [];

  // Get expenses
  if (group.expenses && Array.isArray(group.expenses)) {
    group.expenses.forEach((exp, idx) => {
      activities.push({
        _id: `${groupId}-expense-${idx}`,
        type: "expense",
        title: "Expense Added",
        description: exp.description || "Expense logged",
        amount: exp.amount,
        user: exp.spentBy || { username: "Unknown", email: "" },
        date: exp.date,
        createdAt: exp.date,
        groupId,
        groupName: group.name,
      });
    });
  }

  // Get messages
  if (group.messages && Array.isArray(group.messages)) {
    group.messages.forEach((msg, idx) => {
      activities.push({
        _id: `${groupId}-message-${idx}`,
        type: "message",
        title: "Message",
        description: msg.content || "New message",
        user: msg.sender || { username: "Unknown", email: "" },
        date: msg.timestamp,
        createdAt: msg.timestamp,
        groupId,
        groupName: group.name,
      });
    });
  }

  // Get wallet transactions
  const wallet = await GroupWallet.findOne({ group: groupId })
    .populate("transactions.fromUser", "username email avatar")
    .lean();

  if (wallet && wallet.transactions && Array.isArray(wallet.transactions)) {
    wallet.transactions.forEach((tx, idx) => {
      activities.push({
        _id: `${groupId}-tx-${idx}`,
        type: tx.type === "deposit" ? "payment" : "settlement",
        title: tx.type === "deposit" ? "Pool Contribution" : "Settlement",
        description: `${tx.type} of $${tx.amount}`,
        amount: tx.amount,
        user: tx.fromUser || { username: "Unknown", email: "" },
        date: tx.date,
        createdAt: tx.date,
        groupId,
        groupName: group.name,
      });
    });
  }

  // Sort by date (newest first)
  activities.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Pagination
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 50;
  const startIdx = (pageNum - 1) * limitNum;
  const paginatedActivities = activities.slice(startIdx, startIdx + limitNum);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        activities: paginatedActivities,
        total: activities.length,
        page: pageNum,
        limit: limitNum,
      },
      "Group activities retrieved successfully"
    )
  );
});

// Get activity statistics
const getActivityStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get all groups where user is a member
  const groups = await Group.find({
    $or: [{ owner: userId }, { members: userId }],
  }).select("expenses messages").lean();

  if (groups.length === 0) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          totalActivities: 0,
          expenses: 0,
          payments: 0,
          messages: 0,
          poolActivities: 0,
        },
        "No activities found"
      )
    );
  }

  const groupIds = groups.map((g) => g._id);

  // Count expenses
  let expensesCount = 0;
  for (const group of groups) {
    if (group.expenses && Array.isArray(group.expenses)) {
      expensesCount += group.expenses.length;
    }
  }

  // Count messages
  let messagesCount = 0;
  for (const group of groups) {
    if (group.messages && Array.isArray(group.messages)) {
      messagesCount += group.messages.length;
    }
  }

  // Count wallet transactions
  const wallets = await GroupWallet.find({ group: { $in: groupIds } })
    .select("transactions")
    .lean();

  let paymentsCount = 0;
  for (const wallet of wallets) {
    if (wallet.transactions && Array.isArray(wallet.transactions)) {
      paymentsCount += wallet.transactions.length;
    }
  }

  const stats = {
    totalActivities: expensesCount + messagesCount + paymentsCount,
    expenses: expensesCount,
    payments: paymentsCount,
    messages: messagesCount,
    poolActivities: 0,
  };

  return res.status(200).json(
    new ApiResponse(200, stats, "Activity statistics retrieved successfully")
  );
});

export { getActivityFeed, getGroupActivities, getActivityStats };
