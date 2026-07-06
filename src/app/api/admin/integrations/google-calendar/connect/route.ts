import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { buildGoogleAuthUrl } from "@/lib/integrations/google-calendar/oauth";
import { isGoogleCalendarConfigured } from "@/lib/integrations/google-calendar/sync";

const STATE_COOKIE = "gcal_oauth_state";

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
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
