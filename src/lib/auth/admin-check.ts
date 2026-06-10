import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { getAuthFromRequest } from "@/lib/auth/jwt";
import { getTokenStaffRole, isAdminRole, tokenHasStaffAccess } from "@/lib/auth/roles";
import {
  fetchCustomerManagerAccessRow,
  isManagerPanelAccessEnabled,
} from "@/lib/auth/manager-access";

/**
 * Verify the request comes from an authenticated admin via JWT
 * (HTTP-only cookie or Authorization header).
 */
export async function verifyAdmin(
  req: NextRequest
): Promise<{ authorized: true; adminId: string } | { authorized: false; response: NextResponse }> {
  const tokenPayload = await getAuthFromRequest(req);
  if (!tokenPayload) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      ),
    };
  }

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
