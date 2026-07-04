import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/jwt";
import { disconnectGoogleCalendar } from "@/lib/google/calendar";
import { logger } from "@/lib/utils/logger";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const success = await disconnectGoogleCalendar(auth.sub);

    if (!success) {
      return NextResponse.json(
        { success: false, message: "Failed to disconnect Google Calendar" },
        { status: 500 }
      );
    }

    logger.info(`Google Calendar disconnected for customer ${auth.sub}`);

    return NextResponse.json({
      success: true,
      message: "Google Calendar disconnected successfully",
    });
  } catch (error) {
    logger.error("Google disconnect error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to disconnect Google Calendar" },
      { status: 500 }
    );
  }
}
