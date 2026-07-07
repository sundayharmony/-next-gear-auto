import { NextRequest, NextResponse } from "next/server";
import { getPrimaryCalendarId, listWritableCalendars } from "@/lib/integrations/google-calendar/client";
import { exchangeAuthCode, oauthClientWithRefreshToken } from "@/lib/integrations/google-calendar/oauth";
import {
  GCAL_OAUTH_FLASH_COOKIE,
  getCanonicalSiteOrigin,
  getOAuthCookieOptions,
} from "@/lib/integrations/google-calendar/oauth-site";
import {
  reconcileFleetCalendar,
  saveGoogleCalendarConnection,
} from "@/lib/integrations/google-calendar/sync";
import { logger } from "@/lib/utils/logger";

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

function redirectWithFlash(
  origin: string,
  flash: { type: "success" | "error"; message: string },
  params?: Record<string, string>
) {
  const response = NextResponse.redirect(adminPageUrl(origin, params));
  const cookieOpts = getOAuthCookieOptions();
  response.cookies.set(GCAL_OAUTH_FLASH_COOKIE, JSON.stringify(flash), {
    ...cookieOpts,
    maxAge: 120,
  });
  response.cookies.delete(STATE_COOKIE);
  response.cookies.delete(ADMIN_COOKIE);
  return response;
}

export async function GET(req: NextRequest) {
  const canonicalOrigin = getCanonicalSiteOrigin();
  const requestOrigin = new URL(req.url).origin;
  if (process.env.NODE_ENV === "production" && requestOrigin !== canonicalOrigin) {
    const target = new URL(req.url);
    const canonical = new URL(canonicalOrigin);
    target.protocol = canonical.protocol;
    target.host = canonical.host;
    return NextResponse.redirect(target);
  }

  const siteOrigin = canonicalOrigin;
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const googleError = searchParams.get("error");
  const cookieState = req.cookies.get(STATE_COOKIE)?.value;
  const adminId = req.cookies.get(ADMIN_COOKIE)?.value;

  if (googleError) {
    const description = searchParams.get("error_description") || googleError;
    logger.warn("Google Calendar OAuth denied", { googleError, description });
    return redirectWithFlash(siteOrigin, {
      type: "error",
      message: `Google authorization failed: ${description}`,
    });
  }

  if (!code || !state || !cookieState || state !== cookieState || !adminId) {
    logger.warn("Google Calendar OAuth callback missing session", {
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasCookieState: Boolean(cookieState),
      stateMatches: Boolean(state && cookieState && state === cookieState),
      hasAdminId: Boolean(adminId),
    });
    return redirectWithFlash(
      siteOrigin,
      {
        type: "error",
        message:
          "OAuth session expired — stay on www.rentnextgearauto.com, then connect again from Admin → Google Calendar",
      },
      { error: "OAuth session expired — connect again from Admin → Google Calendar" }
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

    return redirectWithFlash(
      siteOrigin,
      { type: "success", message: "Google Calendar connected." },
      { connected: "1" }
    );
  } catch (err) {
    let message = err instanceof Error ? err.message : "Google OAuth failed";
    if (/invalid_client/i.test(message)) {
      message =
        "Google client secret is invalid — in Google Cloud Console open Credentials → NGA Fleet Calendar → reset the client secret, then update GOOGLE_CALENDAR_CLIENT_SECRET in Vercel and redeploy.";
    }
    logger.error("Google Calendar OAuth callback failed", err);
    return redirectWithFlash(siteOrigin, { type: "error", message }, { error: message });
  }
}
