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
import { isAppRole, isStaffRole } from "@/lib/auth/roles";

const ACCESS_TOKEN_EXPIRES_IN_SEC = 3600;

/**
 * Token refresh endpoint.
 * Reads the refresh token from cookies (web) or JSON body `{ refreshToken }` (native),
 * issues a new access + refresh pair (rotation).
 */
export async function POST(req: NextRequest) {
  try {
    let refreshRaw = req.cookies.get(REFRESH_COOKIE)?.value;
    let body: { refreshToken?: string; client?: string } | undefined;

    if (!refreshRaw) {
      try {
        body = await req.json();
        if (typeof body?.refreshToken === "string") {
          refreshRaw = body.refreshToken;
        }
      } catch {
        // no JSON body
      }
    }

    if (!refreshRaw) {
      const response = NextResponse.json(
        { success: false, message: "No refresh token." },
        { status: 401 }
      );
      return clearAuthCookies(response);
    }

    const nativeClient =
      req.headers.get("x-nga-client") === "native" ||
      body?.client === "native" ||
      body?.client === "android";

    const cookiePresent = Boolean(req.cookies.get(REFRESH_COOKIE)?.value);
    const refreshedViaBodyOnly = !cookiePresent && typeof body?.refreshToken === "string";

    const payload = await verifyToken(refreshRaw);

    // Ensure this is actually a refresh token, not an access token being reused
    if (!payload || !payload.sub || !payload.role || !payload.email || payload.type !== "refresh") {
      const response = NextResponse.json(
        { success: false, message: "Invalid or expired refresh token." },
        { status: 401 }
      );
      return clearAuthCookies(response);
    }

    // Issue new token pair (rotation)
    if (!isAppRole(payload.role)) {
      const response = NextResponse.json(
        { success: false, message: "Invalid role in refresh token." },
        { status: 401 }
      );
      return clearAuthCookies(response);
    }
    const role = payload.role;
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

    const includeTokensInJson =
      isStaffRole(role) && (nativeClient || refreshedViaBodyOnly);

    const jsonPayload = includeTokensInJson
      ? {
          success: true as const,
          tokens: {
            accessToken,
            refreshToken,
            tokenType: "Bearer" as const,
            expiresIn: ACCESS_TOKEN_EXPIRES_IN_SEC,
          },
        }
      : { success: true as const };

    const response = NextResponse.json(jsonPayload);
    return setAuthCookies(response, accessToken, refreshToken);
  } catch (err) {
    logger.error("Token refresh error:", err);
    const response = NextResponse.json({ success: false, message: "Token refresh failed" }, { status: 500 });
    return clearAuthCookies(response);
  }
}
