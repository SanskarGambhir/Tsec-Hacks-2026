import express from "express"
import cors from "cors"
// Import Routes
import healthCheckRouter from "./routes/healthcheck.routes.js";
import authRouter from "./routes/auth.routes.js";
import walletRouter from "./routes/wallet.routes.js";
import groupRouter from "./routes/group.routes.js";
import groupPaymentRouter from "./routes/groupPayment.routes.js";
import memberActionsRouter from "./routes/memberActions.routes.js";
import creditWithdrawalRouter from "./routes/creditWithdrawal.routes.js";
import userProfileRouter from "./routes/userProfile.routes.js";
import friendRouter from "./routes/friend.routes.js";
import sharedExpenseRouter from "./routes/sharedExpense.routes.js";
import activityRouter from "./routes/activity.routes.js";
import aiInsightsRouter from "./routes/aiInsights.routes.js";
import cookieParser from "cookie-parser";
import billRoutes from "./routes/bill.routes.js";


const app = express();



app.use(cors({
  origin: [
    "https://tsec-hacks-2026-8j2o.vercel.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"]
}));

// Basic Configurations
app.use(express.json({ limit: "16kb" })) // Accept json data
app.use(express.urlencoded({ extended: true, limit: "16kb" })) // Accept parameters from the url
app.use(express.static("public")) // Use "public" folder
app.use(cookieParser()) // Parse cookies

app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/wallet", walletRouter);
app.use("/api/v1/groups", groupRouter);
app.use("/api/v1/friends", friendRouter);
app.use("/api/v1/shared-expenses", sharedExpenseRouter);
app.use("/api/v1/bill", billRoutes);
app.use("/api/v1/group-payments", groupPaymentRouter);
app.use("/api/v1/members", memberActionsRouter);
app.use("/api/v1/credit-withdrawals", creditWithdrawalRouter);
app.use("/api/v1/user", userProfileRouter);
app.use("/api/v1/activity", activityRouter);
app.use("/api/v1/ai-insights", aiInsightsRouter);
app.use("/api/v1/credit-withdrawals", creditWithdrawalRouter);
app.use("/api/v1/user", userProfileRouter);
app.use("/api/v1/activity", activityRouter);


app.get('/', (req, res) => {
  res.send("Welcome to my Project")
})

export default app;