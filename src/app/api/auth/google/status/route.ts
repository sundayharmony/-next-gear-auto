import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/jwt";
import { isGoogleCalendarConnected } from "@/lib/google/calendar";
import { isGoogleOAuthConfigured } from "@/lib/google/oauth";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const configured = isGoogleOAuthConfigured();
    if (!configured) {
      return NextResponse.json({
        success: true,
        data: {
          configured: false,
          connected: false,
        },
      });
    }

    const connected = await isGoogleCalendarConnected(auth.sub);

    return NextResponse.json({
      success: true,
      data: {
        configured: true,
        connected,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to check Google Calendar status" },
      { status: 500 }
    );
  }
}
