import { Router } from "express";
import { createGroup, logExpense, addRule } from "../controllers/group.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT to all routes in this file

router.route("/").post(createGroup);
router.route("/:groupId/expense").post(logExpense);
router.route("/:groupId/rules").post(addRule);

export default router;
