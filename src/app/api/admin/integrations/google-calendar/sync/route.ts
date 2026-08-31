import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { formatGoogleCalendarError } from "@/lib/integrations/google-calendar/errors";
import { formatReconcileSummary, reconcileFleetCalendar } from "@/lib/integrations/google-calendar/sync";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const result = await reconcileFleetCalendar();
    return NextResponse.json({
      success: true,
      partial: result.errors.length > 0,
      message: formatReconcileSummary(result),
      data: result,
    });
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
