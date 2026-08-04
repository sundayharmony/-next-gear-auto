import { after } from "next/server";
import { logger } from "@/lib/utils/logger";

/**
 * Schedule work to finish after the HTTP response.
 * Plain `void promise` is unreliable on Vercel — the isolate can freeze once
 * the response is sent (admin create returns immediately; checkout often
 * survives only because Stripe work keeps the request alive).
 */
export function scheduleGoogleCalendarWork(
  label: string,
  task: () => Promise<unknown>
): void {
  const run = () =>
    task().catch((err) => {
      logger.error(`Google Calendar ${label} failed:`, err);
    });

  try {
    after(run);
  } catch {
    // Scripts/tests (no request scope): still attempt the work.
    void run();
  }
}
