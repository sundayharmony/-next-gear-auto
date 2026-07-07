import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { buildGoogleAuthUrl } from "@/lib/integrations/google-calendar/oauth";
import {
  getCanonicalSiteOrigin,
  getOAuthCookieOptions,
} from "@/lib/integrations/google-calendar/oauth-site";
import { isGoogleCalendarConfigured } from "@/lib/integrations/google-calendar/sync";

const STATE_COOKIE = "gcal_oauth_state";
const ADMIN_COOKIE = "gcal_oauth_admin_id";

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json(
      { success: false, message: "Google Calendar OAuth is not configured on the server" },
      { status: 500 }
    );
  }

  const canonicalOrigin = getCanonicalSiteOrigin();
  const requestOrigin = new URL(req.url).origin;
  if (process.env.NODE_ENV === "production" && requestOrigin !== canonicalOrigin) {
    const target = new URL(req.url);
    const canonical = new URL(canonicalOrigin);
    target.protocol = canonical.protocol;
    target.host = canonical.host;
    return NextResponse.redirect(target);
  }

  const state = randomBytes(24).toString("hex");
  const url = buildGoogleAuthUrl(state, canonicalOrigin);
  const response = NextResponse.redirect(url);
  const cookieOpts = getOAuthCookieOptions();
  response.cookies.set(STATE_COOKIE, state, cookieOpts);
  // Admin JWT cookies are SameSite=strict and are not sent on Google's cross-site redirect.
  response.cookies.set(ADMIN_COOKIE, auth.adminId, cookieOpts);
  return response;
}
