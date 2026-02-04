import { Router } from "express";
import {
  addAmountToWallet,
  addNewWallet,
  paymentIntentResponse,
  paymentVerify,
  getBalance,
  getUserTransactions,
  checkPayments,
  completeDeposit,
} from "../controllers/wallet.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

// Below line of code means that when a POST request is made to "/register", the registerUser controller function will be called.
// Unsecure Routes
router.route("/add").post(verifyJWT, addAmountToWallet);
router.route("/add_new").post(verifyJWT, addNewWallet);
router.route("/pay").post(verifyJWT, paymentIntentResponse);
router.route("/pay_verify").post(verifyJWT, paymentVerify);
router.route("/balance").get(verifyJWT, getBalance);
router.route("/get_trans").get(verifyJWT, getUserTransactions);
router.route("/check_payments").get(verifyJWT, checkPayments);
router.route("/complete_deposit/:intentId").post(verifyJWT, completeDeposit);


export default router;
