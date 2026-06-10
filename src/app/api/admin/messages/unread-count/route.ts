import { NextRequest, NextResponse } from "next/server";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";
import { staffMessagingMasterEnabled } from "@/lib/config/staff-messaging-server";

type RpcUnreadRow = { thread_id: string; unread_count: number };

/** GET /api/admin/messages/unread-count — lightweight badge count for layout polling. */
export async function GET(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;

  if (!staffMessagingMasterEnabled()) {
    return NextResponse.json(
      { success: true, data: { unreadCount: 0 }, messagingEnabled: false },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const supabase = getServiceSupabase();

  try {
    const { data: memberships, error: membershipsError } = await supabase
      .from("message_thread_members")
      .select("thread_id, last_read_at")
      .eq("user_id", auth.userId)
      .eq("status", "active");

    if (membershipsError) {
      logger.error("Failed to list memberships for unread count", membershipsError);
      return NextResponse.json({ success: false, message: "Failed to load unread count" }, { status: 500 });
    }

    const threadIds = (memberships || []).map((m: { thread_id: string }) => m.thread_id);
    if (threadIds.length === 0) {
      return NextResponse.json(
        { success: true, data: { unreadCount: 0 }, messagingEnabled: true },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    let unreadTotal = 0;
    const { data: unreadRpc, error: unreadRpcError } = await supabase.rpc("staff_message_thread_unread_counts", {
      p_user_id: auth.userId,
      p_thread_ids: threadIds,
    });

    if (!unreadRpcError && Array.isArray(unreadRpc)) {
      for (const row of unreadRpc as RpcUnreadRow[]) {
        unreadTotal += Number(row.unread_count) || 0;
      }
    } else {
      if (unreadRpcError) {
        logger.warn("staff_message_thread_unread_counts RPC unavailable; falling back to per-thread counts", unreadRpcError);
      }
      for (const membership of memberships || []) {
        let q = supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("thread_id", membership.thread_id)
          .is("deleted_at", null)
          .neq("sender_user_id", auth.userId);
        if (membership.last_read_at) q = q.gt("created_at", membership.last_read_at);
        const { count } = await q;
        unreadTotal += count || 0;
      }
    }

    return NextResponse.json(
      { success: true, data: { unreadCount: unreadTotal }, messagingEnabled: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    logger.error("Unread count failed", error);
    return NextResponse.json({ success: false, message: "Failed to load unread count" }, { status: 500 });
  }
}
