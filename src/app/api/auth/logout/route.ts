import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth/jwt";
import { logger } from "@/lib/utils/logger";

export async function POST() {
  try {
    const response = NextResponse.json({ success: true, message: "Logged out." });
    return clearAuthCookies(response);
  } catch (err) {
    logger.error("Logout error:", err);
    return NextResponse.json({ success: false, message: "Logout failed" }, { status: 500 });
  }
}
