import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import healthCheckRouter from "./routes/healthcheck.routes.js";
import authRouter from "./routes/auth.routes.js";
import walletRouter from "./routes/wallet.routes.js";
import groupRouter from "./routes/group.routes.js";
import groupPaymentRouter from "./routes/groupPayment.routes.js";
import memberActionsRouter from "./routes/memberActions.routes.js";
import userProfileRouter from "./routes/userProfile.routes.js";
import friendRouter from "./routes/friend.routes.js";
import sharedExpenseRouter from "./routes/sharedExpense.routes.js";
import activityRouter from "./routes/activity.routes.js";
import aiInsightsRouter from "./routes/aiInsights.routes.js";
import billRouter from "./routes/bill.routes.js";

import { ApiError } from "./utils/api-error.js";
import { globalLimiter } from "./utils/rateLimiter.js";

const app = express();

// Trust the proxy so req.ip is the real client address behind a load balancer;
// without it every request appears to come from one address and the rate
// limiter would throttle all users together.
app.set("trust proxy", 1);

const allowedOrigins = [
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "https://tsec-hacks-2026-lac.vercel.app",
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin and server-to-server calls arrive without an Origin header.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  })
);

// OCR text from a long receipt comfortably exceeds the old 16kb ceiling.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use(express.static("public"));

app.use("/api/v1", globalLimiter);

app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/wallet", walletRouter);
app.use("/api/v1/groups", groupRouter);
app.use("/api/v1/friends", friendRouter);
app.use("/api/v1/shared-expenses", sharedExpenseRouter);
app.use("/api/v1/bill", billRouter);
app.use("/api/v1/group-payments", groupPaymentRouter);
app.use("/api/v1/members", memberActionsRouter);
app.use("/api/v1/user", userProfileRouter);
app.use("/api/v1/activity", activityRouter);
app.use("/api/v1/ai-insights", aiInsightsRouter);

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "Cooper API" });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== "production";

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
      ...(isDev && { stack: err.stack }),
    });
  }

  // Mongoose surfaces these as generic 500s otherwise, which is misleading for
  // what are really bad requests.
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: Object.values(err.errors).map((e) => e.message),
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "A record with those details already exists",
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid identifier" });
  }

  console.error("Unhandled error:", err);

  return res.status(err.statusCode || 500).json({
    success: false,
    // Internal error text can leak schema and infrastructure details.
    message: isDev ? err.message : "Internal Server Error",
    ...(isDev && { stack: err.stack }),
  });
});

export default app;
