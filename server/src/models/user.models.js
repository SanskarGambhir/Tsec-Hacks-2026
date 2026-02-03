import mongoose, { mongo, Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const userSchema = new Schema(
  {
    avatar: {
      type: {
        url: String,
        localPath: String
      },
      default: {
        url: `https://placehold.co/100x100`,
        localPath: ""
      },
    },

    username : {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: [true, "Password is required"]
    },

    isEmailVerified: {
      type: Boolean,
      default: false
    },

    refreshToken: {
      type: String
    },

    forgotPasswordToken: {
      type: String
    },

    forgotPasswordExpiry: {
      type: Date
    },

    emailVerificationToken: {
      type: String
    },

    emailVerificationExpiry: {
      type: Date
    }
  },
  {
    timestamps: true,
  },
)

// Use "pre" hook to hash password before saving user in the database
userSchema.pre("save", async function () {
  if(!this.isModified("password")) return // If password is not modified, move to next middleware
  this.password = await bcrypt.hash(this.password, 10) // Hash the password with a salt round of 10
})

// Method to compare entered password with hashed password in the database
userSchema.methods.isPasswordCorrect = async function(password){
  return await bcrypt.compare(password, this.password)
}

// Method to generate JWT access token
// Inside the payload, we can add any user details that we want to include in the token
userSchema.methods.generateAccessToken = function(){
  return jwt.sign(
    {
      _id: this._id, // Default ID field created by MongoDB
      email: this.email,
      username: this.username
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
  )
}

// Method to generate JWT refresh token
userSchema.methods.generateRefreshToken = function(){
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    }
  )
}

// Method to generate forgot password token(Temporary token)
userSchema.methods.generateTemporaryForgotPasswordToken = function(){
  const forgotToken = crypto.randomBytes(20).toString("hex") // Generate a random token of 20 bytes

  const forgotPasswordToken = crypto.createHash("sha256").update(forgotToken).digest("hex") // Hash the token and set to forgotPasswordToken field

  const forgotPasswordExpiry = Date.now() + (20*60*1000) // Set expiry time to 20 minutes from now

  return {forgotToken, forgotPasswordToken, forgotPasswordExpiry}
}

export const User = mongoose.model("User", userSchema)