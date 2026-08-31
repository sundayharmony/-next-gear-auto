import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { formatGoogleCalendarError } from "@/lib/integrations/google-calendar/errors";
import {
  GCAL_OAUTH_FLASH_COOKIE,
  getCanonicalSiteOrigin,
} from "@/lib/integrations/google-calendar/oauth-site";
import {
  getGoogleCalendarStatus,
  isGoogleCalendarConfigured,
  reconcileFleetCalendar,
  updateGoogleCalendarSelection,
} from "@/lib/integrations/google-calendar/sync";
import { logger } from "@/lib/utils/logger";

function oauthRedirectUri(): string | undefined {
  try {
    return `${getCanonicalSiteOrigin()}/api/admin/integrations/google-calendar/callback`;
  } catch {
    return undefined;
  }
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const status = await getGoogleCalendarStatus();
    const flashRaw = req.cookies.get(GCAL_OAUTH_FLASH_COOKIE)?.value;
    let flash: { type: "success" | "error"; message: string } | undefined;
    if (flashRaw) {
      try {
        flash = JSON.parse(flashRaw) as { type: "success" | "error"; message: string };
      } catch {
        flash = undefined;
      }
    }

    const response = NextResponse.json({
      success: true,
      data: {
        ...status,
        configured: isGoogleCalendarConfigured(),
        oauthRedirectUri: oauthRedirectUri(),
        flash,
      },
    });
    if (flashRaw) {
      response.cookies.delete(GCAL_OAUTH_FLASH_COOKIE);
    }
    return response;
  } catch (err) {
    logger.error("Google Calendar status load failed", err);
    return NextResponse.json(
      {
        success: false,
        message: formatGoogleCalendarError(err),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const calendarId = String(body.calendarId || "").trim();
    const calendarSummary =
      typeof body.calendarSummary === "string" ? body.calendarSummary.trim() : null;
    if (!calendarId) {
      return NextResponse.json(
        { success: false, message: "calendarId is required" },
        { status: 400 }
      );
    }
    await updateGoogleCalendarSelection(calendarId, calendarSummary);
    const result = await reconcileFleetCalendar();
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: formatGoogleCalendarError(err),
      },
      { status: 500 }
    );
  }
}
