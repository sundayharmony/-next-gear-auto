import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { getAuthFromRequest } from "@/lib/auth/jwt";
import { loginLimiter, getClientIp } from "@/lib/security/rate-limit";
import { getTokenStaffRole, isAdminRole, tokenHasStaffAccess } from "@/lib/auth/roles";
import { isValidEmailFormat } from "@/lib/utils/validation";
import {
  fetchCustomerManagerAccessRow,
  isManagerPanelAccessEnabled,
} from "@/lib/auth/manager-access";

/**
 * Verify the request comes from an authenticated admin.
 *
 * Authentication methods (checked in order):
 *   1. JWT in HTTP-only cookie or Authorization header (preferred)
 *   2. Legacy x-admin-id header (opt-in via ALLOW_LEGACY_ADMIN_HEADER=true)
 *
 * Returns the admin ID if valid, or a 401/403 response if not.
 */
export async function verifyAdmin(
  req: NextRequest
): Promise<{ authorized: true; adminId: string } | { authorized: false; response: NextResponse }> {
  // ── Method 1: JWT-based auth (preferred) ──────────────────────────
  const tokenPayload = await getAuthFromRequest(req);
  if (tokenPayload) {
    if (!isAdminRole(tokenPayload.role)) {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, message: "Admin access required" },
          { status: 403 }
        ),
      };
    }
    return { authorized: true, adminId: tokenPayload.sub };
  }

  // ── Method 2: Legacy header-based auth (opt-in) ───────────────────
  if (process.env.ALLOW_LEGACY_ADMIN_HEADER !== "true") {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  const clientIp = getClientIp(req);
  const rateCheck = loginLimiter.check(`admin-legacy:${clientIp}`);
  if (!rateCheck.allowed) {
    return {
      authorized: false,
      response: new NextResponse(
        JSON.stringify({ success: false, message: "Too many requests. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(Math.max(0, Math.ceil((rateCheck.resetAt - Date.now()) / 1000))) } }
      ),
    };
  }

  const adminId = req.headers.get("x-admin-id");
  if (!adminId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  // Validate adminId format: UUID or email
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(adminId) && !isValidEmailFormat(adminId)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      ),
    };
  }

  try {
    const supabase = getServiceSupabase();
    const { data: admin, error } = await supabase
      .from("admins")
      .select("id")
      .eq("id", adminId)
      .single();

    if (error || !admin) {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 403 }
        ),
      };
    }

    return { authorized: true, adminId: admin.id };
  } catch {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, message: "Authentication failed" },
        { status: 500 }
      ),
    };
  }
}

export async function verifyAdminOrManager(
  req: NextRequest
): Promise<{ authorized: true; userId: string; role: "admin" | "manager" } | { authorized: false; response: NextResponse }> {
  const tokenPayload = await getAuthFromRequest(req);
  const staffRole = tokenPayload ? getTokenStaffRole(tokenPayload) : null;
  if (!tokenPayload || !staffRole || !tokenHasStaffAccess(tokenPayload)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, message: "Staff access required" },
        { status: 403 }
      ),
    };
  }
  return { authorized: true, userId: tokenPayload.sub, role: staffRole };
}

/** Staff auth with DB check that manager panel access has not been revoked. */
export async function verifyManagerWithPanelAccess(
  req: NextRequest
): Promise<
  | { authorized: true; userId: string; role: "admin" | "manager" }
  | { authorized: false; response: NextResponse }
> {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth;
  if (auth.role === "admin") return auth;

  try {
    const supabase = getServiceSupabase();
    const row = await fetchCustomerManagerAccessRow(supabase, auth.userId);
    if (!isManagerPanelAccessEnabled(row)) {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, message: "Manager access has been revoked." },
          { status: 403 }
        ),
      };
    }
    return auth;
  } catch {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, message: "Authentication failed" },
        { status: 500 }
      ),
    };
  }
}
