import crypto from "crypto";
import jwt from "jsonwebtoken";

import { User } from "../models/user.models.js";
import { PhoneInvite } from "../models/phoneInvite.models.js";
import { Friend } from "../models/friend.models.js";
import { UserWallet } from "../models/wallet.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  sendEmail,
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
} from "../utils/mail.js";
import { sendOTP, verifyOTP } from "../utils/twilio.js";

const frontendUrl = () => process.env.FRONTEND_URL || "http://localhost:5173";

const serverUrl = (req) =>
  process.env.SERVER_URL || `${req.protocol}://${req.get("host")}`;

/** Cookies carry the tokens; `secure` is required for SameSite=None to work. */
const cookieOptions = () => {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
};

const generateAccessAndRefreshToken = async (user) => {
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

/**
 * A phone invite turns into an accepted friendship the moment the invited
 * person appears, whether that is at signup or at their next login.
 */
const redeemPhoneInvite = async (inviteToken, user) => {
  if (!inviteToken) return;

  try {
    const invite = await PhoneInvite.findValidInvite(inviteToken);
    if (!invite || invite.phoneNumber !== user.phone) return;

    const existing = await Friend.findOne({
      $or: [
        { requester: invite.sender, recipient: user._id },
        { requester: user._id, recipient: invite.sender },
      ],
    });

    if (existing) {
      if (existing.status !== "accepted") {
        existing.status = "accepted";
        await existing.save();
      }
    } else {
      await Friend.create({
        requester: invite.sender,
        recipient: user._id,
        status: "accepted",
      });
    }

    invite.status = "accepted";
    await invite.save();
  } catch (error) {
    // An invite that cannot be redeemed must never block signing in.
    console.error("Phone invite redemption failed:", error.message);
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { email, username, password, phone, panCard, inviteToken } = req.body;

  const panCardHash = User.hashPan(panCard);

  const existing = await User.findOne({
    $or: [{ username }, { email }, { phone }, { panCardHash }],
  });

  if (existing) {
    // Deliberately vague: naming the field that collided tells an attacker
    // whether a given email or phone number is registered.
    throw new ApiError(409, "An account with those details already exists");
  }

  const user = await User.create({
    email,
    username,
    password,
    phone,
    panCardHash,
    panCardLast4: panCard.slice(-4),
    isEmailVerified: false,
    isPhoneVerified: false,
  });

  await UserWallet.create({ user: user._id, balance: 0 });

  const { forgotToken, forgotPasswordToken, forgotPasswordExpiry } =
    user.generateTemporaryForgotPasswordToken();

  user.emailVerificationToken = forgotPasswordToken;
  user.emailVerificationExpiry = forgotPasswordExpiry;
  await user.save({ validateBeforeSave: false });

  // Email and SMS are best-effort: the account exists either way and both can
  // be re-sent, so we report what actually happened rather than implying
  // success the way the previous version did.
  let emailSent = true;
  try {
    await sendEmail({
      email: user.email,
      subject: "Verify your email",
      mailgenContent: emailVerificationMailgenContent(
        user.username,
        `${serverUrl(req)}/api/v1/auth/verify-email/${forgotToken}`
      ),
    });
  } catch (error) {
    emailSent = false;
    console.error("Verification email failed:", error.message);
  }

  let otpSent = true;
  try {
    await sendOTP(user.phone);
  } catch (error) {
    otpSent = false;
    console.error("Registration OTP failed:", error.message);
  }

  await redeemPhoneInvite(inviteToken, user);

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -panCardHash"
  );

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { user: createdUser, emailSent, otpSent },
        "Account created. Verify your phone number to continue."
      )
    );
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password, inviteToken } = req.body;

  const user = await User.findOne({ email });

  // One message and one status code for both "no such user" and "wrong
  // password", so login cannot be used to discover registered addresses.
  const invalid = new ApiError(401, "Invalid email or password");

  if (!user) throw invalid;
  if (!(await user.isPasswordCorrect(password))) throw invalid;

  if (!user.isPhoneVerified) {
    throw new ApiError(403, "Please verify your phone number before logging in");
  }

  await redeemPhoneInvite(inviteToken, user);

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -panCardHash"
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions())
    .cookie("refreshToken", refreshToken, cookieOptions())
    .json(new ApiResponse(200, { user: loggedInUser }, "Logged in successfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $set: { refreshToken: null } });

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions())
    .clearCookie("refreshToken", cookieOptions())
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const wallet = await UserWallet.findOne({ user: req.user._id });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user: req.user, wallet },
        "Current user fetched successfully"
      )
    );
});

/**
 * Verification links are clicked in a browser, so this redirects back into the
 * app rather than returning JSON at the user.
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;

  const hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: { $gt: Date.now() },
  });

  if (!user) {
    return res.redirect(`${frontendUrl()}/login?verified=failed`);
  }

  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });

  return res.redirect(`${frontendUrl()}/login?verified=success`);
});

const resendVerificationEmail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) throw new ApiError(404, "User not found");
  if (user.isEmailVerified) throw new ApiError(409, "Email is already verified");

  const { forgotToken, forgotPasswordToken, forgotPasswordExpiry } =
    user.generateTemporaryForgotPasswordToken();

  user.emailVerificationToken = forgotPasswordToken;
  user.emailVerificationExpiry = forgotPasswordExpiry;
  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user.email,
    subject: "Verify your email",
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${serverUrl(req)}/api/v1/auth/verify-email/${forgotToken}`
    ),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, {}, "Verification email sent. Please check your inbox.")
    );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await User.findById(decodedToken?._id);

  // A token that does not match the stored one has been rotated away by a
  // newer refresh, or revoked at logout.
  if (!user || user.refreshToken !== incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is expired. Please log in again.");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user);

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions())
    .cookie("refreshToken", refreshToken, cookieOptions())
    .json(new ApiResponse(200, {}, "Access token refreshed successfully"));
});

/**
 * Always reports success. Telling an anonymous caller that an address is not
 * registered turns this endpoint into an account-enumeration oracle.
 */
const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (user) {
    const { forgotToken, forgotPasswordToken, forgotPasswordExpiry } =
      user.generateTemporaryForgotPasswordToken();

    user.forgotPasswordToken = forgotPasswordToken;
    user.forgotPasswordExpiry = forgotPasswordExpiry;
    await user.save({ validateBeforeSave: false });

    try {
      await sendEmail({
        email: user.email,
        subject: "Reset your password",
        mailgenContent: forgotPasswordMailgenContent(
          user.username,
          `${frontendUrl()}/reset-password/${forgotToken}`
        ),
      });
    } catch (error) {
      console.error("Password reset email failed:", error.message);
    }
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "If an account exists for that address, a reset link has been sent."
      )
    );
});

const resetForgotPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { newPassword } = req.body;

  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired password reset token");
  }

  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;
  user.password = newPassword;
  // Resetting a password logs every existing session out.
  user.refreshToken = null;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  if (!(await user.isPasswordCorrect(oldPassword))) {
    throw new ApiError(401, "Current password is incorrect");
  }

  if (oldPassword === newPassword) {
    throw new ApiError(400, "New password must be different from the current one");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const verifyPhoneOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    // Same shape as a wrong code, so this cannot confirm an address exists.
    throw new ApiError(400, "Invalid or expired code");
  }

  if (user.isPhoneVerified) {
    return res.status(200).json(new ApiResponse(200, {}, "Phone already verified"));
  }

  let result;
  try {
    result = await verifyOTP(user.phone, otp);
  } catch {
    throw new ApiError(400, "Invalid or expired code");
  }

  if (result.status !== "approved") {
    throw new ApiError(400, "Invalid or expired code");
  }

  user.isPhoneVerified = true;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Phone verified successfully"));
});

const resendPhoneOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Every send costs real money, so only send for an account that actually
  // needs verifying — but report the same thing either way.
  if (user && !user.isPhoneVerified) {
    try {
      await sendOTP(user.phone);
    } catch (error) {
      console.error("OTP resend failed:", error.message);
    }
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "If that account needs verification, a code has been sent."
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  verifyEmail,
  resendVerificationEmail,
  forgotPasswordRequest,
  refreshAccessToken,
  resetForgotPassword,
  changeCurrentPassword,
  verifyPhoneOTP,
  resendPhoneOTP,
};
