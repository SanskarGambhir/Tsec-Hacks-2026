import mongoose, { mongo, Schema } from 'mongoose';

const userWalletSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },

    balance: {
      type: Number,
      default: 0
    },

    currency: {
      type: String,
      default: "INR"
    },

    status: {
      type: String,
      enum: ["ACTIVE", "FROZEN"],
      default: "ACTIVE"
    }
  },
  { timestamps: true }
);

const eventWalletSchema = new Schema(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      unique: true
    },

    totalBalance: {
      type: Number,
      default: 0
    },

    currency: {
      type: String,
      default: "INR"
    }
  },
  { timestamps: true }
);

const eventMemberLedgerSchema = new Schema(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    deposited: {
      type: Number,
      default: 0
    },

    spentShare: {
      type: Number,
      default: 0
    },

    refundable: {
      type: Number,
      default: 0
    },

    payable: {
      type: Number,
      default: 0
    },

    categories: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category"
      }
    ]
  },
  { timestamps: true }
);


export const UserWallet = mongoose.model("UserWallet", userWalletSchema)
export const EventWallet = mongoose.model("EventWallet", eventWalletSchema)
export const EventMemberLedger = mongoose.model("EventMemberLedger", eventMemberLedgerSchema)