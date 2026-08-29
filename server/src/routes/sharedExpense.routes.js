import { Router } from "express";
import {
  createSharedExpense,
  getSharedExpense,
} from "../controllers/sharedExpense.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Creating requires an account — the creator is taken from the session rather
// than from the request body, which previously let anyone forge one.
router.route("/create").post(verifyJWT, createSharedExpense);

// Reading stays public: the whole point of a share link is that the people
// splitting the bill do not need to sign up.
router.route("/:shareLink").get(getSharedExpense);

export default router;
