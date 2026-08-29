import { Router } from "express";

import {
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
} from "../controllers/auth.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authLimiter, otpLimiter } from "../utils/rateLimiter.js";
import {
  validate,
  registerSchema,
  loginSchema,
  emailOnlySchema,
  otpSchema,
  passwordResetSchema,
  changePasswordSchema,
} from "../validators/index.js";

const router = Router();

/* Public. Credential and OTP endpoints are rate limited — every OTP send costs
   real money and an unlimited one is an SMS-bombing tool. */

router.route("/register").post(authLimiter, validate(registerSchema), registerUser);
router.route("/login").post(authLimiter, validate(loginSchema), loginUser);

router.route("/verify-email/:verificationToken").get(verifyEmail);

router.route("/refresh-token").post(refreshAccessToken);

router
  .route("/forgot-password")
  .post(authLimiter, validate(emailOnlySchema), forgotPasswordRequest);

router
  .route("/reset-password/:resetToken")
  .post(authLimiter, validate(passwordResetSchema), resetForgotPassword);

router.route("/verify-phone").post(otpLimiter, validate(otpSchema), verifyPhoneOTP);

router
  .route("/resend-phone-otp")
  .post(otpLimiter, validate(emailOnlySchema), resendPhoneOTP);

/* Authenticated */

router.route("/logout").post(verifyJWT, logoutUser);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/resend-verification-email").post(verifyJWT, otpLimiter, resendVerificationEmail);
router
  .route("/change-password")
  .post(verifyJWT, validate(changePasswordSchema), changeCurrentPassword);

export default router;
