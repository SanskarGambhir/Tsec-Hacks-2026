import { Router } from "express";

import {
  createGroup,
  logExpense,
  addRule,
  removeRule,
  addFundsToGroup,
  joinGroup,
  getGroupDetails,
  sendMessage,
  getMessages,
  getUserGroups,
  sendGroupInviteToFriend,
  sendGroupInviteViaWhatsApp,
  getGroupInvites,
  acceptGroupInvite,
  rejectGroupInvite,
  acceptGroupInviteByToken,
  getGroupTransactions,
  completeGroupDeposit,
  cancelGroupDeposit,
  groupPaymentIntent,
  leaveGroup,
  getGroupPendingInvites,
} from "../controllers/group.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { otpLimiter, paymentLimiter } from "../utils/rateLimiter.js";
import {
  validate,
  createGroupSchema,
  expenseSchema,
  messageSchema,
  ruleSchema,
  amountSchema,
  groupIdParamSchema,
  paginationSchema,
} from "../validators/index.js";

const router = Router();

router.use(verifyJWT);

/* Invite routes must precede the parameterised ones or "/invites" would be
   matched as a group id. */
router.route("/invite/friend").post(sendGroupInviteToFriend);
router.route("/invite/whatsapp").post(otpLimiter, sendGroupInviteViaWhatsApp);
router.route("/invites").get(getGroupInvites);
router.route("/invites/:inviteId/accept").post(acceptGroupInvite);
router.route("/invites/:inviteId/reject").post(rejectGroupInvite);
router.route("/invite-token/:token/accept").post(acceptGroupInviteByToken);

router.route("/").post(validate(createGroupSchema), createGroup);
router.route("/user-groups").get(getUserGroups);

/* Everything below addresses a single group. */
const groupId = validate(groupIdParamSchema, "params");

router.route("/:groupId").get(groupId, getGroupDetails);
router.route("/:groupId/join").post(groupId, joinGroup);
router.route("/:groupId/leave").post(groupId, leaveGroup);
router.route("/:groupId/expense").post(groupId, validate(expenseSchema), logExpense);
router.route("/:groupId/rules").post(groupId, validate(ruleSchema), addRule);
router.route("/:groupId/rules/:ruleIndex").delete(groupId, removeRule);
router
  .route("/:groupId/add-funds")
  .post(groupId, paymentLimiter, validate(amountSchema), addFundsToGroup);
router.route("/:groupId/messages").post(groupId, validate(messageSchema), sendMessage);
router
  .route("/:groupId/messages")
  .get(groupId, validate(paginationSchema, "query"), getMessages);
router.route("/:groupId/transactions").get(groupId, getGroupTransactions);
router
  .route("/:groupId/pay")
  .post(groupId, paymentLimiter, validate(amountSchema), groupPaymentIntent);
router.route("/:groupId/complete-deposit/:intentId").post(groupId, completeGroupDeposit);
router.route("/:groupId/cancel-deposit/:intentId").post(groupId, cancelGroupDeposit);
router.route("/:groupId/pending-invites").get(groupId, getGroupPendingInvites);

export default router;
