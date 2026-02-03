import express from "express"
import cors from "cors"
// Import Routes
import healthCheckRouter from "./routes/healthcheck.routes.js";
import authRouter from "./routes/auth.routes.js";
import cookieParser from "cookie-parser";

const app = express();

// CORS Configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:5173",
  credentials:true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], // Methods that we are supporting
  allowedHeaders: ["Authorization", "Content-Type"],
}))

// Basic Configurations
app.use(express.json({ limit:"16kb" })) // Accept json data
app.use(express.urlencoded({ extended:true, limit:"16kb" })) // Accept parameters from the url
app.use(express.static("public")) // Use "public" folder
app.use(cookieParser()) // Parse cookies

app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/auth", authRouter);

app.get('/', (req, res) => {
  res.send("Welcome to my Project")
})

export default app;