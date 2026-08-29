import { Router } from "express";

import {
  addNewWallet,
  getBalance,
  getUserTransactions,
  paymentIntentResponse,
  paymentVerify,
} from "../controllers/wallet.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { paymentLimiter } from "../utils/rateLimiter.js";
import { validate, amountSchema, paginationSchema } from "../validators/index.js";

const router = Router();

router.use(verifyJWT);

router.route("/add_new").post(addNewWallet);
router.route("/balance").get(getBalance);
router.route("/get_trans").get(validate(paginationSchema, "query"), getUserTransactions);

// Deposits are two-step: create a Razorpay order, then settle it against a
// verified signature. There is deliberately no endpoint that credits a balance
// without a payment behind it.
router.route("/pay").post(paymentLimiter, validate(amountSchema), paymentIntentResponse);
router.route("/pay_verify").post(paymentLimiter, paymentVerify);

export default router;
