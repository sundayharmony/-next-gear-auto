import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { getAuthFromRequest } from "@/lib/auth/jwt";
import { loginLimiter, getClientIp, rateLimitResponse } from "@/lib/security/rate-limit";

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
  // Rate-limit legacy header to prevent brute force attacks
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
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!uuidRegex.test(adminId) && !emailRegex.test(adminId)) {
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
