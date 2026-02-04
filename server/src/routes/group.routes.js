import { Router } from "express";
import { createGroup, logExpense, addRule, addFundsToGroup, joinGroup, getGroupDetails } from "../controllers/group.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT to all routes in this file

router.route("/").post(createGroup);
router.route("/:groupId").get(getGroupDetails); // Get group details
router.route("/:groupId/join").post(joinGroup);
router.route("/:groupId/expense").post(logExpense);
router.route("/:groupId/rules").post(addRule);
router.route("/:groupId/add-funds").post(addFundsToGroup);

export default router;
