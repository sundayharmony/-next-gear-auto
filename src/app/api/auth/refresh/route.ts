import { NextRequest, NextResponse } from "next/server";
import {
  verifyToken,
  createAccessToken,
  createRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  REFRESH_COOKIE,
} from "@/lib/auth/jwt";
import { logger } from "@/lib/utils/logger";

/**
 * Token refresh endpoint.
 * Reads the refresh token from cookies, issues a new access + refresh pair.
 * Implements sliding-window refresh token rotation.
 */
export async function POST(req: NextRequest) {
  try {
    const refreshTokenCookie = req.cookies.get(REFRESH_COOKIE)?.value;

    if (!refreshTokenCookie) {
      const response = NextResponse.json(
        { success: false, message: "No refresh token." },
        { status: 401 }
      );
      return clearAuthCookies(response);
    }

    const payload = await verifyToken(refreshTokenCookie);

    // Ensure this is actually a refresh token, not an access token being reused
    if (!payload || !payload.sub || !payload.role || !payload.email || payload.type !== "refresh") {
      const response = NextResponse.json(
        { success: false, message: "Invalid or expired refresh token." },
        { status: 401 }
      );
      return clearAuthCookies(response);
    }

    // Issue new token pair (rotation)
    const role = payload.role as "admin" | "customer";
    const accessToken = await createAccessToken({
      userId: payload.sub,
      role,
      email: payload.email as string,
    });
    const refreshToken = await createRefreshToken({
      userId: payload.sub,
      role,
      email: payload.email as string,
    });

    const response = NextResponse.json({ success: true });
    return setAuthCookies(response, accessToken, refreshToken);
  } catch (err) {
    logger.error("Token refresh error:", err);
    const response = NextResponse.json({ success: false, message: "Token refresh failed" }, { status: 500 });
    return clearAuthCookies(response);
  }
}
