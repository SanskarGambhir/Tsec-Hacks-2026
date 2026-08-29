import mongoose, { Schema } from 'mongoose';

const expenseParticipantSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  sharePercentage: {
    type: Number,
    required: true
  },
  shareAmount: {
    type: Number,
    required: true
  }
});

const sharedExpenseSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  participants: [expenseParticipantSchema],
  creator: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  creatorName: {
    type: String,
    required: true
  },
  creatorEmail: {
    type: String,
    required: true
  },
  shareLink: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export const SharedExpense = mongoose.model("SharedExpense", sharedExpenseSchema);