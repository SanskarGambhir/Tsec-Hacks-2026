import { Router } from "express";
import { processGroupPayment } from "../controllers/groupPayment.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT to all routes in this file

router.route("/:groupId/process-payment").post(processGroupPayment);

export default router;