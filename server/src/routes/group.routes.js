import { Router } from "express";
import { 
  createGroup, 
  logExpense, 
  addRule, 
  addFundsToGroup, 
  joinGroup, 
  getGroupDetails, 
  sendMessage, 
  getUserGroups,
  sendGroupInviteToFriend,
  sendGroupInviteViaWhatsApp,
  getGroupInvites,
  acceptGroupInvite,
  rejectGroupInvite,
  acceptGroupInviteByToken
} from "../controllers/group.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT to all routes in this file

// Group invite routes (MUST be before parameterized routes like /:groupId)
router.route("/invite/friend").post(sendGroupInviteToFriend);
router.route("/invite/whatsapp").post(sendGroupInviteViaWhatsApp);
router.route("/invites").get(getGroupInvites);
router.route("/invites/:inviteId/accept").post(acceptGroupInvite);
router.route("/invites/:inviteId/reject").post(rejectGroupInvite);
router.route("/invite-token/:token/accept").post(acceptGroupInviteByToken);

// Group management routes
router.route("/").post(createGroup);
router.route("/user-groups").get(getUserGroups); // Get all groups user is member of
router.route("/:groupId").get(getGroupDetails); // Get group details
router.route("/:groupId/join").post(joinGroup);
router.route("/:groupId/expense").post(logExpense);
router.route("/:groupId/rules").post(addRule);
router.route("/:groupId/add-funds").post(addFundsToGroup);
router.route("/:groupId/messages").post(sendMessage);

export default router;
