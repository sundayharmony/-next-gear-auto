import { NextResponse } from "next/server";
import {
  getGoogleCalendarStatus,
  maintainGoogleCalendarTokenHealth,
} from "@/lib/integrations/google-calendar/sync";
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
    const result = await maintainGoogleCalendarTokenHealth({ force: true });
    const status = await getGoogleCalendarStatus();
    if (!result.ok) {
      logger.warn("Google Calendar token refresh cron failed", {
        needsReauth: result.needsReauth,
        error: result.error,
      });
    }
    return NextResponse.json({
      success: result.ok,
      needsReconnect: status.needsReconnect,
      lastTokenRefreshAt: status.lastTokenRefreshAt,
      message: result.ok
        ? "Google Calendar token refreshed"
        : status.needsReconnect
          ? "Google Calendar needs reconnect"
          : result.error,
    });
  } catch (err) {
    logger.error("Google Calendar token cron failed:", err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Token refresh failed",
      },
      { status: 500 }
    );
  }
}
