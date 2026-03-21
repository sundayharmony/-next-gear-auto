import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { getAuthFromRequest } from "@/lib/auth/jwt";

/**
 * Verify the request comes from an authenticated admin.
 *
 * Authentication methods (checked in order):
 *   1. JWT in HTTP-only cookie or Authorization header (preferred)
 *   2. Legacy x-admin-id header (backward compat — will be removed)
 *
 * Returns the admin ID if valid, or a 401/403 response if not.
 */
export async function verifyAdmin(
  req: NextRequest
): Promise<{ authorized: true; adminId: string } | { authorized: false; response: NextResponse }> {
  // ── Method 1: JWT-based auth (preferred) ──────────────────────────
  const tokenPayload = await getAuthFromRequest(req);
  if (tokenPayload) {
    if (tokenPayload.role !== "admin") {
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

  // ── Method 2: Legacy header-based auth (backward compat) ──────────
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
