import { NextRequest, NextResponse } from "next/server";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { getServiceSupabase } from "@/lib/db/supabase";
import { requireActiveMembership } from "@/lib/messaging/service";
import { staffMessagingMasterEnabled } from "@/lib/config/staff-messaging-server";

type Params = { params: Promise<{ threadId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;
  if (!staffMessagingMasterEnabled()) {
    return NextResponse.json({ success: true, data: { skipped: true }, messagingEnabled: false });
  }
  const { threadId } = await params;
  const supabase = getServiceSupabase();

  const member = await requireActiveMembership(supabase, threadId, auth.userId);
  if (!member) {
    return NextResponse.json({ success: false, message: "Thread access denied" }, { status: 403 });
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("message_thread_members")
    .update({ last_read_at: now })
    .eq("thread_id", threadId)
    .eq("user_id", auth.userId)
    .eq("status", "active");

  if (error) {
    return NextResponse.json({ success: false, message: "Failed to update read state" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: { threadId, last_read_at: now }, messagingEnabled: true });
}
