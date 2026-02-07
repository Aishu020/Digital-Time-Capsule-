import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import capsuleRoutes from "./routes/capsules.js";
import { startScheduler } from "./services/scheduler.js";

const app = express();

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/capsules", capsuleRoutes);

async function start() {
  await mongoose.connect(config.mongoUri);
  startScheduler();
  app.listen(config.port, () => {
    console.log(`API running on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
