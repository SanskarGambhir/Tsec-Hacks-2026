import { User } from '../models/user.models.js';
import { ApiResponse } from '../utils/api-response.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendEmail } from '../utils/mail.js';
import { emailVerificationMailgenContent, forgotPasswordMailgenContent } from '../utils/mail.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendOTP, verifyOTP } from "../utils/twilio.js";



const generateAccessAndRefreshToken = async (userId) => {
  try{
    // Find user by ID
    const user = await User.findById(userId);
    // Generate tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Save refresh token to database
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch(error) {
    throw new ApiError(500, 'Error generating tokens');
  }
}

const registerUser = asyncHandler(async (req, res) => {
  const { email, username, password, phone, panCard } = req.body;

  if (!email || !username || !password || !phone || !panCard) {
    throw new ApiError(400, "All fields are required");
  }

  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(panCard)) {
    throw new ApiError(400, "Invalid PAN format");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }, { phone }],
  });

  if (existedUser) {
    throw new ApiError(409, "Username, email or phone already exists");
  }

  const user = await User.create({
    email,
    username,
    password,
    phone,
    panCard,
    isEmailVerified: false,
    isPhoneVerified: false,
  });

  const { forgotToken, forgotPasswordToken, forgotPasswordExpiry } =
    user.generateTemporaryForgotPasswordToken();

  user.emailVerificationToken = forgotPasswordToken;
  user.emailVerificationExpiry = forgotPasswordExpiry;

  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user.email,
    subject: "Email Verification",
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${forgotToken}`
    ),
  });

  // 🔥 SEND PHONE OTP
  await sendOTP(phone);

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
  );

  return res.status(201).json(
    new ApiResponse(
      201,
      { user: createdUser },
      "User registered. Verify email and phone."
    )
  );
});


const loginUser = asyncHandler(async (req, res) => {
  // 1. Get email and password from req.body
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required fields', []);
  }

  // 2. Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(401, 'User does not exist (Invalid email or password)', []);
  }

  // 3. Check if password matches
  const isPasswordvalid = await user.isPasswordCorrect(password);
  if (!isPasswordvalid) {
    throw new ApiError(401, 'Invalid email or password', []);
  }



if (!user.isPhoneVerified) {
  throw new ApiError(403, "Please verify your phone before login");
}

  // 4. Generate access and refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select('-password -refreshToken -emailVerificationToken -emailVerificationExpiry');

  // 5. Send response with tokens in cookies
  const option = {
    httpOnly: true,
    secure: true
  };
  return res
    .status(200)
    .cookie('accessToken', accessToken, option)
    .cookie('refreshToken', refreshToken, option)
    .json(
      new ApiResponse(
        200,
        {user: loggedInUser},
        'User logged in successfully'
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // Clear refresh token from database
  await User.findByIdAndUpdate(req.user._id, 
    { 
      $set: { 
        refreshToken: null 
      } 
    },
    {
      new: true
    }
  ); 

  const options = {
    httpOnly: true,
    secure: true,
  }
  return res
    .status(200)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
    .json(
      new ApiResponse(200, {}, 'User logged out successfully')
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(
      new ApiResponse(200, { user: req.user }, 'Current user fetched successfully')
    );
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;

  if (!verificationToken) {
    throw new ApiError(400, 'Verification token is missing');
  }

  let hashedToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: { $gt: Date.now() },
  });
  if (!user) {
    throw new ApiError(400, 'Invalid or expired verification token');
  }

  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;

  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(200, 
        {
          isEmailVerified: true
        }, 
        'Email verified successfully')
    );
});

const resendVerificationEmail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if(!user) {
    throw new ApiError(404, 'User not found');
  }

  if(user.isEmailVerified) {
    throw new ApiError(409, 'Email is already verified');
  }

  const {forgotToken, forgotPasswordToken, forgotPasswordExpiry} = user.generateTemporaryForgotPasswordToken();

  user.emailVerificationToken = forgotPasswordToken;
  user.emailVerificationExpiry = forgotPasswordExpiry;

  await user.save({validateBeforeSave: false});

  await sendEmail({
    email: user?.email,
    subject: 'Email Verification',
    mailgenContent: emailVerificationMailgenContent(
      user.username, 
      `${req.protocol}://${req.get('host')}/api/v1/users/verify-email/${forgotToken}`)
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        'Verification email resent successfully. Please check your email to verify your account.'
      )
    );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, 'Unauthorized access');
  }

  try{
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id);

    if(!user) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    if(user.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, 'Refresh token is expired. Please login again.');
    }

    const options = {
      httpOnly: true,
      secure: true
    };

    const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    return res
      .status(200)
      .cookie('accessToken', accessToken, options)
      .cookie('refreshToken', newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken , newRefreshToken},
          'Access token refreshed successfully'
        )
      );
    } catch(error) {
    throw new ApiError(401, 'Invalid refresh token');
  }
});

const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, 'User with this email does not exist');
  }
  
  const { forgotToken, forgotPasswordToken, forgotPasswordExpiry } = user.generateTemporaryForgotPasswordToken();

  user.forgotPasswordToken = forgotPasswordToken;
  user.forgotPasswordExpiry = forgotPasswordExpiry;

  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user?.email,
    subject: 'Password Reset Request',
    mailgenContent: forgotPasswordMailgenContent(
      user.username,
      `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${forgotToken}`
    )
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        'Password reset email sent successfully. Please check your email.'
      )
    );
});

const resetForgotPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { newPassword } = req.body;

  let hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired password reset token');
  }

  user.forgotPasswordExpiry = undefined;
  user.forgotPasswordToken = undefined;

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        'Password has been reset successfully.'
      )
    );
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const isPasswordvalid = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordvalid) {
    throw new ApiError(401, 'Old password is incorrect');
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        'Password has been changed successfully.'
      )
    );
});


const verifyPhoneOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, "Email and OTP required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const response = await verifyOTP(user.phone, otp);

  if (response.status !== "approved") {
    throw new ApiError(400, "Invalid OTP");
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

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  await sendOTP(user.phone);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "OTP resent successfully"));
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
  resendPhoneOTP   // 👈 MUST be here
};
