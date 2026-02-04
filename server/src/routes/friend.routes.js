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

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// Friend operations
router.route("/send-request").post(sendFriendRequest);
router.route("/accept/:requestId").patch(acceptFriendRequest);
router.route("/reject/:requestId").patch(rejectFriendRequest);
router.route("/remove/:friendId").delete(removeFriend);
router.route("/block/:userId").post(blockUser);

// Phone invite operations
router.route("/invite/phone").post(sendPhoneInvite);
router.route("/invite/accept/:token").post(acceptPhoneInvite);

// Get friend lists
router.route("/").get(getFriends);
router.route("/pending").get(getPendingRequests);
router.route("/sent").get(getSentRequests);

// Search users
router.route("/search").get(searchUsers);

export default router;
