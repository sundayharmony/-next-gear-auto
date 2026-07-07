import { NextResponse } from "next/server";
import { formatReconcileSummary, reconcileFleetCalendar } from "@/lib/integrations/google-calendar/sync";
import { logger } from "@/lib/utils/logger";

export const maxDuration = 300;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await reconcileFleetCalendar();
    if (result.errors.length) {
      logger.warn("Google Calendar cron sync completed with errors", {
        errorCount: result.errors.length,
        errors: result.errors.slice(0, 5),
      });
    }
    return NextResponse.json({
      success: true,
      partial: result.errors.length > 0,
      message: formatReconcileSummary(result),
      data: result,
    });
  } catch (err) {
    logger.error("Google Calendar cron sync failed:", err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Sync failed",
      },
      { status: 500 }
    );
  }
}
