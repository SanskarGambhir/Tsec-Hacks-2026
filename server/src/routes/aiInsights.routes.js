import { Router } from "express";
import {
  getExpenseInsights,
  getBehavioralAnalysis,
  getSpendingCoach,
} from "../controllers/aiInsights.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { aiLimiter } from "../utils/rateLimiter.js";

const router = Router();

router.use(verifyJWT);
// Each of these is a billed model call.
router.use(aiLimiter);

router.route("/expense-insights").get(getExpenseInsights);
router.route("/behavioral-analysis").get(getBehavioralAnalysis);
router.route("/spending-coach").get(getSpendingCoach);

export default router;
