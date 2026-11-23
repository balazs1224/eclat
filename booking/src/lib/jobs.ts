// Időzített feladatok: 5–10 percenként futtatandó (cron → /api/cron, vagy `npm run jobs:run`).
import { pool } from "./db";
import { deliverOutbox } from "./email";
import { syncAllFeeds } from "./ical";
import { expireHolds } from "./booking/service";
import { pruneRateLimits } from "./rate-limit";

export async function runJobs() {
  const expired = await expireHolds(pool());
  const ical = await syncAllFeeds();
  const email = await deliverOutbox(50);
  await pruneRateLimits();
  return { expiredHolds: expired, ical, email };
}
