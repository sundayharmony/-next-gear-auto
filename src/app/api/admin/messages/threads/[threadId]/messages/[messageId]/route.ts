import { NextRequest, NextResponse } from "next/server";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";
import { requireActiveMembership } from "@/lib/messaging/service";
import { staffMessagingMasterEnabled } from "@/lib/config/staff-messaging-server";

type Params = { params: Promise<{ threadId: string; messageId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await verifyAdminOrManager(_req);
  if (!auth.authorized) return auth.response;
  if (!staffMessagingMasterEnabled()) {
    return NextResponse.json({ success: false, message: "Staff messaging is disabled" }, { status: 403 });
  }

  const { threadId, messageId } = await params;
  const supabase = getServiceSupabase();

  const member = await requireActiveMembership(supabase, threadId, auth.userId);
  if (!member) {
    return NextResponse.json({ success: false, message: "Thread access denied" }, { status: 403 });
  }

  try {
    const { data: row, error: fetchError } = await supabase
      .from("messages")
      .select("id, sender_user_id, deleted_at")
      .eq("id", messageId)
      .eq("thread_id", threadId)
      .maybeSingle();

    if (fetchError || !row) {
      return NextResponse.json({ success: false, message: "Message not found" }, { status: 404 });
    }
    if (row.deleted_at) {
      return NextResponse.json({ success: false, message: "Message already deleted" }, { status: 410 });
    }
    if (row.sender_user_id !== auth.userId) {
      return NextResponse.json({ success: false, message: "You can only delete your own messages" }, { status: 403 });
    }

    const now = new Date().toISOString();
    const { error: delError } = await supabase
      .from("messages")
      .update({ deleted_at: now, updated_at: now })
      .eq("id", messageId)
      .eq("thread_id", threadId);

    if (delError) {
      logger.error("Failed to soft-delete message", delError);
      return NextResponse.json({ success: false, message: "Failed to delete message" }, { status: 500 });
    }

    const { data: latest } = await supabase
      .from("messages")
      .select("created_at")
      .eq("thread_id", threadId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    await supabase
      .from("message_threads")
      .update({
        last_message_at: latest?.created_at ?? null,
        updated_at: now,
      })
      .eq("id", threadId);

    await supabase
      .from("notification_outbox")
      .update({
        status: "dead",
        last_error: "message deleted by sender",
        updated_at: now,
      })
      .eq("message_id", messageId)
      .in("status", ["pending", "retry"]);

    return NextResponse.json({ success: true, data: { id: messageId, deleted_at: now }, messagingEnabled: true });
  } catch (error) {
    logger.error("Delete message failed", error);
    return NextResponse.json({ success: false, message: "Failed to delete message" }, { status: 500 });
  }
}
