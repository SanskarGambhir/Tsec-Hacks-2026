import express from "express";
import { processBill } from "../controllers/bill.controller.js";

const router = express.Router();

router.post("/analyze", processBill);

export default router;
