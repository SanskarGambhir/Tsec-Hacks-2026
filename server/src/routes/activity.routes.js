import { Router } from "express";
import {
  getActivityFeed,
  getGroupActivities,
  getActivityStats,
} from "../controllers/activity.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT to all routes in this file

// Activity feed routes
router.route("/feed").get(getActivityFeed);
router.route("/stats").get(getActivityStats);
router.route("/group/:groupId").get(getGroupActivities);

export default router;
