import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { buildGoogleAuthUrl } from "@/lib/integrations/google-calendar/oauth";
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

  const state = randomBytes(24).toString("hex");
  const siteOrigin = new URL(req.url).origin;
  const url = buildGoogleAuthUrl(state, siteOrigin);
  const response = NextResponse.redirect(url);
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/",
  };
  response.cookies.set(STATE_COOKIE, state, cookieOpts);
  // Admin JWT cookies are SameSite=strict and are not sent on Google's cross-site redirect.
  response.cookies.set(ADMIN_COOKIE, auth.adminId, cookieOpts);
  return response;
}
