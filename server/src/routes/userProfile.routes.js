import { Router } from "express";
import { getUserProfile } from "../controllers/userProfile.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT to all routes in this file

router.route("/profile").get(getUserProfile);

export default router;