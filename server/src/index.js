import dotenv from "dotenv";
dotenv.config();

import { createServer } from "http";

import app from "./app.js";
import connectDB from "./db/index.js";
import { initializeSocket } from "./socket.js";
import { validateEnv } from "./utils/validateEnv.js";

// Refuse to start on an incomplete configuration rather than failing later
// inside a request handler.
validateEnv();

const port = process.env.PORT || 8000;

const httpServer = createServer(app);
initializeSocket(httpServer);

connectDB()
  .then(() => {
    httpServer.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to the database:", err);
    process.exit(1);
  });

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down`);
  httpServer.close(() => process.exit(0));
  // Do not hang forever on a stuck connection.
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
