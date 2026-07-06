import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { disconnectGoogleCalendar } from "@/lib/integrations/google-calendar/sync";

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    await disconnectGoogleCalendar();
    return NextResponse.json({ success: true, message: "Google Calendar disconnected" });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Failed to disconnect",
      },
      { status: 500 }
    );
  }
}
