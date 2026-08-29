import { Router } from "express";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getFriends,
  getPendingRequests,
  getSentRequests,
  searchUsers,
  blockUser,
  sendPhoneInvite,
  acceptPhoneInvite,
} from "../controllers/friend.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { otpLimiter } from "../utils/rateLimiter.js";
import { validate, searchSchema } from "../validators/index.js";

const router = Router();

router.use(verifyJWT);

router.route("/send-request").post(sendFriendRequest);
router.route("/accept/:requestId").patch(acceptFriendRequest);
router.route("/reject/:requestId").patch(rejectFriendRequest);
router.route("/remove/:friendId").delete(removeFriend);
router.route("/block/:userId").post(blockUser);

// Sending a WhatsApp invite costs money per message.
router.route("/invite/phone").post(otpLimiter, sendPhoneInvite);
router.route("/invite/accept/:token").post(acceptPhoneInvite);

router.route("/").get(getFriends);
router.route("/pending").get(getPendingRequests);
router.route("/sent").get(getSentRequests);
router.route("/search").get(validate(searchSchema, "query"), searchUsers);

export default router;
