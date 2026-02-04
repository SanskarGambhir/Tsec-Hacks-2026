import express from "express";
import { processBill, splitBill } from "../controllers/bill.controller.js";

const router = express.Router();

router.post("/analyze", processBill);
router.post("/split", splitBill);

export default router;
