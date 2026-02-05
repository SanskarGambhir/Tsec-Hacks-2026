import { Router } from "express";
import { settleCreditWithdrawal } from "../controllers/creditWithdrawal.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT to all routes in this file

router.route("/:withdrawalId/settle").post(settleCreditWithdrawal);

export default router;