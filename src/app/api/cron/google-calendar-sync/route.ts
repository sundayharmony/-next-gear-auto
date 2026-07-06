import { NextResponse } from "next/server";
import { reconcileFleetCalendar } from "@/lib/integrations/google-calendar/sync";
import { logger } from "@/lib/utils/logger";

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
    return NextResponse.json({ success: true, data: result });
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
