import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { getPrimaryCalendarId, listWritableCalendars } from "@/lib/integrations/google-calendar/client";
import { decryptRefreshToken } from "@/lib/integrations/google-calendar/crypto";
import { exchangeAuthCode, oauthClientWithRefreshToken } from "@/lib/integrations/google-calendar/oauth";
import {
  getGoogleCalendarConnection,
  reconcileFleetCalendar,
  saveGoogleCalendarConnection,
} from "@/lib/integrations/google-calendar/sync";

const STATE_COOKIE = "gcal_oauth_state";
const ADMIN_PAGE = "/admin/integrations/google-calendar";

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = req.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(
      `${ADMIN_PAGE}?error=${encodeURIComponent("OAuth state mismatch — try connecting again")}`
    );
  }

  try {
    const siteOrigin = new URL(req.url).origin;
    const tokens = await exchangeAuthCode(code, siteOrigin);
    const refreshToken = tokens.refresh_token!;
    const authClient = oauthClientWithRefreshToken(refreshToken);
    const calendarId = (await getPrimaryCalendarId(authClient)) || "primary";
    const calendars = await listWritableCalendars(authClient);
    const selected = calendars.find((c) => c.id === calendarId);

    await saveGoogleCalendarConnection({
      calendarId,
      calendarSummary: selected?.summary || null,
      refreshToken,
      adminId: auth.adminId,
    });

    void reconcileFleetCalendar().catch(() => {});

    const response = NextResponse.redirect(`${ADMIN_PAGE}?connected=1`);
    response.cookies.delete(STATE_COOKIE);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google OAuth failed";
    const response = NextResponse.redirect(`${ADMIN_PAGE}?error=${encodeURIComponent(message)}`);
    response.cookies.delete(STATE_COOKIE);
    return response;
  }
}
