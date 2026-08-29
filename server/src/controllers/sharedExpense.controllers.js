import crypto from "crypto";

import { SharedExpense } from "../models/sharedExpense.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * A shared expense is a public, link-addressable bill split. Anyone with the
 * link can read it; only a signed-in user can create one, and the creator is
 * taken from the session rather than the request body — previously a caller
 * could put any name and address they liked on someone else's bill.
 */
const createSharedExpense = asyncHandler(async (req, res) => {
  const { title, description, totalAmount, participants } = req.body;

  if (!title || !String(title).trim()) {
    throw new ApiError(400, "Title is required");
  }

  const amount = Number(totalAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, "A positive total amount is required");
  }

  if (!Array.isArray(participants) || participants.length === 0) {
    throw new ApiError(400, "At least one participant is required");
  }

  if (participants.length > 100) {
    throw new ApiError(400, "A shared expense supports at most 100 participants");
  }

  const cleaned = participants.map((participant) => {
    const name = String(participant?.name || "").trim();
    if (!name) throw new ApiError(400, "Every participant needs a name");

    const percentage = Number(participant.sharePercentage);
    if (!Number.isFinite(percentage) || percentage < 0) {
      throw new ApiError(400, "Share percentages must be non-negative numbers");
    }

    return {
      ...participant,
      name,
      sharePercentage: percentage,
      // Derive the amount rather than trusting a client-supplied one that may
      // not agree with the percentage.
      shareAmount: Math.round(((percentage / 100) * amount) * 100) / 100,
    };
  });

  const totalPercentage = cleaned.reduce((sum, p) => sum + p.sharePercentage, 0);
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new ApiError(400, "Participant percentages must sum to 100%");
  }

  const sharedExpense = await SharedExpense.create({
    title: String(title).trim(),
    description: description ? String(description).trim() : "",
    totalAmount: amount,
    participants: cleaned,
    creator: req.user._id,
    creatorName: req.user.username,
    creatorEmail: req.user.email,
    shareLink: crypto.randomBytes(16).toString("hex"),
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { shareLink: sharedExpense.shareLink },
        "Shared expense created successfully"
      )
    );
});

const getSharedExpense = asyncHandler(async (req, res) => {
  const { shareLink } = req.params;

  const sharedExpense = await SharedExpense.findOne({
    shareLink,
    isActive: true,
  })
    // This is a public endpoint, so the creator's identity is limited to the
    // display name rather than the whole user record.
    .select("-creatorEmail -creator")
    .lean();

  if (!sharedExpense) {
    throw new ApiError(404, "Shared expense not found or no longer active");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, sharedExpense, "Shared expense retrieved successfully"));
});

export { createSharedExpense, getSharedExpense };
