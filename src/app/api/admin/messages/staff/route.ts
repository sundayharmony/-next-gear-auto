import { NextRequest, NextResponse } from "next/server";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";
import { staffMessagingMasterEnabled } from "@/lib/config/staff-messaging-server";

export async function GET(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;
  if (!staffMessagingMasterEnabled()) {
    return NextResponse.json({ success: true, data: [], messagingEnabled: false });
  }

  const supabase = getServiceSupabase();
  try {
    const [{ data: admins, error: adminError }, { data: managers, error: managerError }] = await Promise.all([
      supabase.from("admins").select("id, name, email"),
      supabase.from("customers").select("id, name, email, role").eq("role", "manager"),
    ]);

    if (adminError || managerError) {
      logger.error("Failed to load staff directory", { adminError, managerError });
      return NextResponse.json({ success: false, message: "Failed to load staff" }, { status: 500 });
    }

    const data = [
      ...(admins || []).map((a: any) => ({
        id: a.id,
        role: "admin",
        name: a.name || "Admin",
        email: a.email || "",
      })),
      ...(managers || []).map((m: any) => ({
        id: m.id,
        role: "manager",
        name: m.name || "Manager",
        email: m.email || "",
      })),
    ];

    return NextResponse.json({ success: true, data, messagingEnabled: true });
  } catch (error) {
    logger.error("Staff directory failed", error);
    return NextResponse.json({ success: false, message: "Failed to load staff" }, { status: 500 });
  }
}
