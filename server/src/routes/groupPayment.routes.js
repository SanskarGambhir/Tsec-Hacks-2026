import { Router } from "express";
import { processGroupPayment } from "../controllers/groupPayment.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { paymentLimiter } from "../utils/rateLimiter.js";
import { validate, groupIdParamSchema, expenseSchema } from "../validators/index.js";

const router = Router();

router.use(verifyJWT);

router
  .route("/:groupId/process-payment")
  .post(
    validate(groupIdParamSchema, "params"),
    paymentLimiter,
    validate(expenseSchema),
    processGroupPayment
  );

export default router;
