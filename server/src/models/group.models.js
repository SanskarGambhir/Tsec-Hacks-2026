import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema({
  content: {
    type: String,
    required: true,
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const expenseSchema = new Schema({
  amount: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  // Who recorded the expense. Always set by the controller from the
  // authenticated user, so it is genuinely required.
  spentBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // Who actually fronted the money, when that differs from `spentBy`.
  paidBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  date: {
    type: Date,
    default: Date.now,
  },
  category: {
    type: String,
    enum: ["Accommodation", "Food", "Activities", "Transport", "General"],
    default: "General",
  },
  divisionMethod: {
    type: String,
    enum: ["even", "custom", "exclude"],
    default: "even",
  },
  memberCharges: {
    type: Map,
    of: Number,
  },
});

const groupSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    pool: {
      type: Number,
      default: 0,
    },
    ruleType: {
      type: String,
      enum: ["splitwise", "pooling"],
      default: "pooling",
    },
    releaseType: {
      type: String,
      enum: ["instant", "time_locked", "milestone"],
      default: "instant",
    },
    // Time-locked group fields
    unlockDate: {
      type: Date,
      default: null,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    pendingFunds: {
      type: Number,
      default: 0,
    },
    // Milestone group fields
    milestones: [
      {
        title: {
          type: String,
          required: true,
        },
        description: String,
        targetAmount: {
          type: Number,
          required: true,
        },
        currentAmount: {
          type: Number,
          default: 0,
        },
        isCompleted: {
          type: Boolean,
          default: false,
        },
        completedAt: Date,
      },
    ],
    rules: [
      {
        ruleType: {
          type: String, // e.g., "spending_limit", "approval_required"
          required: true,
        },
        ruleValue: {
          type: Schema.Types.Mixed, // flexible value depending on type
          required: true,
        },
        description: String,
      },
    ],
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    wallet: {
      type: Schema.Types.ObjectId,
      ref: "GroupWallet",
    },
    expenses: [expenseSchema],
    messages: [messageSchema],
  },
  {
    timestamps: true,
  },
);

// The two hot lookups are "groups I own" and "groups I belong to".
groupSchema.index({ owner: 1 });
groupSchema.index({ members: 1 });

export const Group = mongoose.model("Group", groupSchema);
