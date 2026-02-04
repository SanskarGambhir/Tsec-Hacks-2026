import { Router } from "express";
import { createSharedExpense, getSharedExpense } from "../controllers/sharedExpense.controllers.js";

const router = Router();

router.route("/create").post(createSharedExpense);
router.route("/:shareLink").get(getSharedExpense);

export default router;