import { NextRequest, NextResponse } from "next/server";
import { getPrimaryCalendarId, listWritableCalendars } from "@/lib/integrations/google-calendar/client";
import { exchangeAuthCode, oauthClientWithRefreshToken } from "@/lib/integrations/google-calendar/oauth";
import {
  reconcileFleetCalendar,
  saveGoogleCalendarConnection,
} from "@/lib/integrations/google-calendar/sync";

const STATE_COOKIE = "gcal_oauth_state";
const ADMIN_COOKIE = "gcal_oauth_admin_id";
const ADMIN_PAGE = "/admin/integrations/google-calendar";

function adminPageUrl(origin: string, params?: Record<string, string>) {
  const url = new URL(ADMIN_PAGE, origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

export async function GET(req: NextRequest) {
  const siteOrigin = new URL(req.url).origin;
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = req.cookies.get(STATE_COOKIE)?.value;
  const adminId = req.cookies.get(ADMIN_COOKIE)?.value;

  if (!code || !state || !cookieState || state !== cookieState || !adminId) {
    return NextResponse.redirect(
      adminPageUrl(siteOrigin, {
        error: "OAuth session expired — open admin, then connect again",
      })
    );
  }

  try {
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
      adminId,
    });

    void reconcileFleetCalendar().catch(() => {});

    const response = NextResponse.redirect(adminPageUrl(siteOrigin, { connected: "1" }));
    response.cookies.delete(STATE_COOKIE);
    response.cookies.delete(ADMIN_COOKIE);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google OAuth failed";
    const response = NextResponse.redirect(adminPageUrl(siteOrigin, { error: message }));
    response.cookies.delete(STATE_COOKIE);
    response.cookies.delete(ADMIN_COOKIE);
    return response;
  }
}
