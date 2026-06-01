import { NextRequest, NextResponse } from "next/server";
import {
  verifyToken,
  setAuthCookies,
  clearAuthCookies,
  REFRESH_COOKIE,
} from "@/lib/auth/jwt";
import { logger } from "@/lib/utils/logger";
import { isAppRole, isAdminRole } from "@/lib/auth/roles";
import { getServiceSupabase } from "@/lib/db/supabase";
import { isManagerPanelAccessEnabled } from "@/lib/auth/manager-access";
import {
  CUSTOMER_CAPABILITIES_SELECT,
  hasManagerPortalAccess,
  hasOwnerPortalAccess,
  resolveCustomerRoles,
} from "@/lib/auth/customer-capabilities";
import { issueCustomerTokens } from "@/lib/auth/issue-customer-tokens";
import { createAccessToken, createRefreshToken } from "@/lib/auth/jwt";

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

    if (!payload || !payload.sub || !payload.role || !payload.email || payload.type !== "refresh") {
      const response = NextResponse.json(
        { success: false, message: "Invalid or expired refresh token." },
        { status: 401 }
      );
      return clearAuthCookies(response);
    }

    if (!isAppRole(payload.role)) {
      const response = NextResponse.json(
        { success: false, message: "Invalid role in refresh token." },
        { status: 401 }
      );
      return clearAuthCookies(response);
    }

    if (isAdminRole(payload.role)) {
      const accessToken = await createAccessToken({
        userId: payload.sub,
        role: "admin",
        roles: ["admin"],
        email: payload.email as string,
      });
      const refreshToken = await createRefreshToken({
        userId: payload.sub,
        role: "admin",
        roles: ["admin"],
        email: payload.email as string,
      });
      const response = NextResponse.json({ success: true });
      return setAuthCookies(response, accessToken, refreshToken);
    }

    const supabase = getServiceSupabase();
    const { data: row } = await supabase
      .from("customers")
      .select(CUSTOMER_CAPABILITIES_SELECT)
      .eq("id", payload.sub)
      .maybeSingle();

    if (!row) {
      const response = NextResponse.json(
        { success: false, message: "Account not found." },
        { status: 401 }
      );
      return clearAuthCookies(response);
    }

    const roles = resolveCustomerRoles(row);
    if (!hasManagerPortalAccess(row) && !hasOwnerPortalAccess(row) && roles.length === 0) {
      const response = NextResponse.json(
        { success: false, message: "Access is no longer valid." },
        { status: 401 }
      );
      return clearAuthCookies(response);
    }

    if (row.role === "manager" && !isManagerPanelAccessEnabled(row) && !hasOwnerPortalAccess(row)) {
      const response = NextResponse.json(
        { success: false, message: "Manager access is no longer valid." },
        { status: 401 }
      );
      return clearAuthCookies(response);
    }

    const { accessToken, refreshToken } = await issueCustomerTokens({
      id: payload.sub,
      email: payload.email as string,
      ...row,
    });

    const response = NextResponse.json({ success: true });
    return setAuthCookies(response, accessToken, refreshToken);
  } catch (err) {
    logger.error("Token refresh error:", err);
    const response = NextResponse.json({ success: false, message: "Token refresh failed" }, { status: 500 });
    return clearAuthCookies(response);
  }
}
