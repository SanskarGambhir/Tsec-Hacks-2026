import { analyzeBillText } from "../utils/gemini.js";
import { calculateSplit } from "../utils/splitEngine.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/** OCR text in, structured line items out. */
export const processBill = asyncHandler(async (req, res) => {
  const { text, members } = req.body;

  if (!text || typeof text !== "string" || !text.trim()) {
    throw new ApiError(400, "Receipt text is required");
  }

  // The OCR output for a long receipt is sizeable but not unbounded.
  if (text.length > 20000) {
    throw new ApiError(400, "Receipt text is too long");
  }

  const roster = Array.isArray(members)
    ? members.map((m) => String(m).trim()).filter(Boolean).slice(0, 50)
    : [];

  const data = await analyzeBillText(text, roster);

  // The model is prompted for this shape but not bound to it, so every field
  // is coerced before it reaches the split engine.
  data.items = data.items.map((item) => ({
    name: String(item?.name || "Item").slice(0, 120),
    quantity: Number(item?.quantity) || 1,
    price: Number(String(item?.price ?? "").replace(/[^\d.]/g, "")) || 0,
    assignedTo: Array.isArray(item?.assignedTo)
      ? item.assignedTo.filter((n) => roster.includes(n))
      : [],
    isShared: Boolean(item?.isShared),
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, data, "Bill parsed successfully"));
});

/** Turn assigned line items into a per-person total. */
export const splitBill = asyncHandler(async (req, res) => {
  const { items, members } = req.body;

  if (!Array.isArray(items) || !Array.isArray(members) || members.length === 0) {
    throw new ApiError(400, "Items and a non-empty members list are required");
  }

  const balances = calculateSplit(items, members);

  return res
    .status(200)
    .json(new ApiResponse(200, { balances }, "Split calculated successfully"));
});
