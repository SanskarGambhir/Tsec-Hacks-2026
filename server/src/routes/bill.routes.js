import { Router } from "express";
import { processBill, splitBill } from "../controllers/bill.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { aiLimiter } from "../utils/rateLimiter.js";

const router = Router();

// Both endpoints were previously unauthenticated: anyone could burn the
// project's Gemini quota by posting receipt text at /analyze.
router.use(verifyJWT);

router.post("/analyze", aiLimiter, processBill);
router.post("/split", splitBill);

export default router;
