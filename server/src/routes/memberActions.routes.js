import { Router } from "express";
import { withdrawCredits, addMemberFunds } from "../controllers/memberActions.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT to all routes in this file

router.route("/:groupId/withdraw-credits").post(withdrawCredits);
router.route("/:groupId/add-member-funds").post(addMemberFunds);

export default router;