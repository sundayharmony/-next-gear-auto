import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";

/**
 * Verify the request comes from an authenticated admin.
 * Checks the x-admin-id header against the admins table.
 * Returns the admin record if valid, or a 401 response if not.
 */
export async function verifyAdmin(
  req: NextRequest
): Promise<{ authorized: true; adminId: string } | { authorized: false; response: NextResponse }> {
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
