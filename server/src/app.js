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
import cookieParser from "cookie-parser";
import billRoutes from "./routes/bill.routes.js";
import { ApiError } from "./utils/api-error.js";


const app = express();

// CORS Configuration
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  "http://localhost:5173",
  "https://tsec-hacks-2026-lac.vercel.app"
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes("*")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
}))

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


app.get('/', (req, res) => {
  res.send("Welcome to my Project")
})

// global error handler
app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
  }

  return res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
});

export default app;