import { Router } from "express";
import { createGroup, logExpense, addRule, addFundsToGroup, joinGroup, getGroupDetails, sendMessage, getUserGroups } from "../controllers/group.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT to all routes in this file

router.route("/").post(createGroup);
router.route("/user-groups").get(getUserGroups); // Get all groups user is member of
router.route("/:groupId").get(getGroupDetails); // Get group details
router.route("/:groupId/join").post(joinGroup);
router.route("/:groupId/expense").post(logExpense);
router.route("/:groupId/rules").post(addRule);
router.route("/:groupId/add-funds").post(addFundsToGroup);
router.route("/:groupId/messages").post(sendMessage);
router.route("/user-groups").get(getUserGroups); // Get all groups user is member of

export default router;
