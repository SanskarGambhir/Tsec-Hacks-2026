import { SharedExpense } from "../models/sharedExpense.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import crypto from 'crypto';

const createSharedExpense = asyncHandler(async (req, res) => {
  const { title, description, totalAmount, participants, creatorName, creatorEmail } = req.body;

  if (!title || !totalAmount || !participants || !creatorName || !creatorEmail) {
    throw new ApiError(400, "Title, total amount, participants, creator name, and creator email are required");
  }

  // Validate participants
  if (!Array.isArray(participants) || participants.length === 0) {
    throw new ApiError(400, "Participants array is required and cannot be empty");
  }

  // Validate each participant
  for (const participant of participants) {
    if (!participant.name || !participant.name.trim()) {
      throw new ApiError(400, "Each participant must have a name");
    }
    // if (typeof participant.sharePercentage !== 'number' || participant.sharePercentage < 0) {
    //   throw new ApiError(400, "Each participant must have a non-negative share percentage");
    // }
    // if (typeof participant.shareAmount !== 'number' || participant.shareAmount < 0) {
    //   throw new ApiError(400, "Each participant must have a non-negative share amount");
    // }
  }

  // Calculate total percentage
  const totalPercentage = participants.reduce((sum, participant) => sum + (Number(participant.sharePercentage || 0)), 0);
  if (Math.abs(totalPercentage - 100) > 0.01) { // Allow small floating point differences
    throw new ApiError(400, "Participant percentages must sum to 100%");
  }

  // Generate unique share link
  const shareLink = crypto.randomBytes(16).toString('hex');

  const sharedExpense = await SharedExpense.create({
    title,
    description: description || "",
    totalAmount,
    participants,
    creatorName,
    creatorEmail,
    shareLink
  });

  if (!sharedExpense) {
    throw new ApiError(500, "Failed to create shared expense");
  }

  return res.status(201).json(
    new ApiResponse(
      201,
      { shareLink: sharedExpense.shareLink },
      "Shared expense created successfully"
    )
  );
});

const getSharedExpense = asyncHandler(async (req, res) => {
  const { shareLink } = req.params;

  if (!shareLink) {
    throw new ApiError(400, "Share link is required");
  }

  const sharedExpense = await SharedExpense.findOne({ shareLink, isActive: true });

  if (!sharedExpense) {
    throw new ApiError(404, "Shared expense not found or is no longer active");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      sharedExpense,
      "Shared expense retrieved successfully"
    )
  );
});

export { createSharedExpense, getSharedExpense };