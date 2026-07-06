import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin-check";
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
  return NextResponse.json({
    success: true,
    data: {
      ...status,
      configured: isGoogleCalendarConfigured(),
    },
  });
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
