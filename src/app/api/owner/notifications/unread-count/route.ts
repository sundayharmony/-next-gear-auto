import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyOwnerWithPortalAccess } from "@/lib/owner/owner-check";
import { logger } from "@/lib/utils/logger";

/** GET /api/owner/notifications/unread-count — lightweight badge count for layout. */
export async function GET(req: NextRequest) {
  const auth = await verifyOwnerWithPortalAccess(req);
  if (!auth.authorized) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const { count, error } = await supabase
      .from("owner_notifications")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", auth.ownerId)
      .eq("is_read", false);

    if (error) {
      logger.error("Owner unread count error:", error);
      return NextResponse.json({ success: false, message: "Failed to load unread count" }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, data: { unreadCount: count ?? 0 } },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    logger.error("Owner unread count error:", err);
    return NextResponse.json({ success: false, message: "Failed to load unread count" }, { status: 500 });
  }
}
