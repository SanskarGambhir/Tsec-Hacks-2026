import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const userSchema = new Schema(
  {
    avatar: {
      type: {
        url: String,
        localPath: String,
      },
      default: {
        url: `https://placehold.co/100x100`,
        localPath: "",
      },
    },

    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    // PAN is a government financial identifier and is never stored in the
    // clear. We keep a keyed hash (for duplicate detection) plus the last four
    // characters, which is all the UI ever needs to display.
    panCardHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    panCardLast4: {
      type: String,
      required: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    refreshToken: String,
    forgotPasswordToken: String,
    forgotPasswordExpiry: Date,
    emailVerificationToken: String,
    emailVerificationExpiry: Date,
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { _id: this._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );
};

userSchema.methods.generateTemporaryForgotPasswordToken = function () {
  const forgotToken = crypto.randomBytes(20).toString("hex");

  const forgotPasswordToken = crypto
    .createHash("sha256")
    .update(forgotToken)
    .digest("hex");

  const forgotPasswordExpiry = Date.now() + 20 * 60 * 1000;

  return { forgotToken, forgotPasswordToken, forgotPasswordExpiry };
};

/** Keyed hash so a leaked database does not leak PAN numbers. */
userSchema.statics.hashPan = function (panCard) {
  const secret = process.env.PAN_HASH_SECRET || process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    throw new Error("PAN_HASH_SECRET (or ACCESS_TOKEN_SECRET) must be set");
  }
  return crypto
    .createHmac("sha256", secret)
    .update(String(panCard).trim().toUpperCase())
    .digest("hex");
};

export const User = mongoose.model("User", userSchema);
