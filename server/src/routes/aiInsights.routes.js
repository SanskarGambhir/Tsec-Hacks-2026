import { Router } from "express";
import {
  getExpenseInsights,
  getBehavioralAnalysis,
  getSpendingCoach,
} from "../controllers/aiInsights.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT to all routes

router.route("/expense-insights").get(getExpenseInsights);
router.route("/behavioral-analysis").get(getBehavioralAnalysis);
router.route("/spending-coach").get(getSpendingCoach);

export default router;
