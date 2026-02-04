import { Group } from "../models/group.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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

  // Deduct from pool and add to expenses
  group.pool -= amount;
  group.expenses.push({
    amount,
    description,
    spentBy: req.user._id
  });

  await group.save();

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

export { createGroup, logExpense, addRule };
