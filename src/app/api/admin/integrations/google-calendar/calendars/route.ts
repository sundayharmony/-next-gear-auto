import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { listWritableCalendars } from "@/lib/integrations/google-calendar/client";
import { decryptRefreshToken } from "@/lib/integrations/google-calendar/crypto";
import { GCAL_RECONNECT_MESSAGE, isGoogleCalendarAuthError } from "@/lib/integrations/google-calendar/oauth-errors";
import { oauthClientWithRefreshToken } from "@/lib/integrations/google-calendar/oauth";
import { getGoogleCalendarConnection } from "@/lib/integrations/google-calendar/sync";

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const connection = await getGoogleCalendarConnection();
  if (!connection) {
    return NextResponse.json(
      { success: false, message: "Google Calendar is not connected" },
      { status: 400 }
    );
  }

  try {
    const refreshToken = decryptRefreshToken(connection.refresh_token_enc);
    const authClient = oauthClientWithRefreshToken(refreshToken);
    const calendars = await listWritableCalendars(authClient);
    return NextResponse.json({ success: true, data: calendars });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list calendars";
    const needsReconnect = isGoogleCalendarAuthError(message);
    return NextResponse.json(
      {
        success: false,
        needsReconnect,
        message: needsReconnect ? GCAL_RECONNECT_MESSAGE : message,
      },
      { status: needsReconnect ? 401 : 500 }
    );
  }
}
