import mongoose, { Schema } from 'mongoose';

const creditWithdrawalSchema = new Schema({
  group: {
    type: Schema.Types.ObjectId,
    ref: "Group",
    required: true
  },
  member: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['issued', 'settled'],
    default: 'issued'
  },
  issuedAt: {
    type: Date,
    default: Date.now
  },
  settledAt: {
    type: Date
  },
  description: {
    type: String,
    trim: true
  },
  transactionId: {
    type: String, // External transaction ID if needed
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

export const CreditWithdrawal = mongoose.model("CreditWithdrawal", creditWithdrawalSchema);