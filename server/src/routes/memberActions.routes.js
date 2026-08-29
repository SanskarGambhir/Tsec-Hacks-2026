import { Router } from "express";
import {
  withdrawCredits,
  addMemberFunds,
} from "../controllers/memberActions.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { paymentLimiter } from "../utils/rateLimiter.js";
import {
  validate,
  groupIdParamSchema,
  amountSchema,
  memberAmountSchema,
} from "../validators/index.js";

const router = Router();

router.use(verifyJWT);

const groupId = validate(groupIdParamSchema, "params");

router
  .route("/:groupId/withdraw-credits")
  .post(groupId, paymentLimiter, validate(amountSchema), withdrawCredits);

router
  .route("/:groupId/add-member-funds")
  .post(groupId, paymentLimiter, validate(memberAmountSchema), addMemberFunds);

export default router;
