import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin-check";
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

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

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
      oauthRedirectUri: `${getCanonicalSiteOrigin()}/api/admin/integrations/google-calendar/callback`,
      flash,
    },
  });
  if (flashRaw) {
    response.cookies.delete(GCAL_OAUTH_FLASH_COOKIE);
  }
  return response;
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
        message: err instanceof Error ? err.message : "Failed to update calendar",
      },
      { status: 500 }
    );
  }
}
