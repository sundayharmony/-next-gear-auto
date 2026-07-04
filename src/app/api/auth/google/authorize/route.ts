import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/jwt";
import { getAuthorizationUrl, isGoogleOAuthConfigured } from "@/lib/google/oauth";
import { logger } from "@/lib/utils/logger";

export async function GET(request: NextRequest) {
  try {
    if (!isGoogleOAuthConfigured()) {
      return NextResponse.json(
        { success: false, message: "Google Calendar integration is not configured" },
        { status: 503 }
      );
    }

    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const state = Buffer.from(JSON.stringify({
      customerId: auth.sub,
      timestamp: Date.now(),
    })).toString("base64url");

    const authUrl = getAuthorizationUrl(state);
    
    return NextResponse.redirect(authUrl);
  } catch (error) {
    logger.error("Google OAuth authorize error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to initiate Google authorization" },
      { status: 500 }
    );
  }
}
