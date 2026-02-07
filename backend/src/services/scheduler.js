import cron from "node-cron";
import { Capsule } from "../models/Capsule.js";

export function startScheduler() {
  cron.schedule("*/1 * * * *", async () => {
    const now = new Date();
    await Capsule.updateMany(
      {
        status: "pending",
        triggerType: "date",
        unlockAt: { $lte: now }
      },
      { status: "released", releasedAt: now }
    );
  });
}
