import dotenv from "dotenv";
import mongoose from "mongoose";

import app from "./app.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const CENTRAL_MONGODB_URI =
  process.env.CENTRAL_MONGODB_URI ||
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/alumni-network";
const ENABLE_DEV_MOCK_MODE = process.env.ENABLE_DEV_MOCK_MODE === "true";

async function startServer() {
  try {
    await mongoose.connect(CENTRAL_MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
    app.locals.mockMode = false;
    app.locals.centralDatabaseUri = CENTRAL_MONGODB_URI;
    console.log("Central MongoDB connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    const isDevelopment = process.env.NODE_ENV !== "production";

    if (!isDevelopment || !ENABLE_DEV_MOCK_MODE) {
      console.error("Failed to start server", error);
      if (isDevelopment && !ENABLE_DEV_MOCK_MODE) {
        console.error("Set ENABLE_DEV_MOCK_MODE=true only if you explicitly want mock API data.");
      }
      process.exit(1);
    }

    app.locals.mockMode = true;
    app.locals.mockReason = error.message;

    console.warn("MongoDB unavailable. Starting API in development mock mode.");
    console.warn(error.message);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (mock mode)`);
    });
  }
}

startServer();
