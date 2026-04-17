import { NextRequest, NextResponse } from "next/server";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";
import { normalizeMessageBody, requireActiveMembership } from "@/lib/messaging/service";
import { staffMessagingMasterEnabled } from "@/lib/config/staff-messaging-server";

type Params = { params: Promise<{ threadId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;
  const { threadId } = await params;
  const supabase = getServiceSupabase();

  if (!staffMessagingMasterEnabled()) {
    return NextResponse.json({ success: true, data: [], messagingEnabled: false });
  }

  const member = await requireActiveMembership(supabase, threadId, auth.userId);
  if (!member) {
    return NextResponse.json({ success: false, message: "Thread access denied" }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50", 10), 1), 100);
  const before = url.searchParams.get("before");

  try {
    let query = supabase
      .from("messages")
      .select("id, thread_id, sender_user_id, sender_role, body, client_message_id, created_at, edited_at, deleted_at")
      .eq("thread_id", threadId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before) query = query.lt("created_at", before);

    const { data, error } = await query;
    if (error) {
      logger.error("Failed to fetch messages", error);
      return NextResponse.json({ success: false, message: "Failed to fetch messages" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: (data || []).reverse(), messagingEnabled: true });
  } catch (error) {
    logger.error("List messages failed", error);
    return NextResponse.json({ success: false, message: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;
  if (!staffMessagingMasterEnabled()) {
    return NextResponse.json({ success: false, message: "Staff messaging is disabled" }, { status: 403 });
  }
  const { threadId } = await params;
  const supabase = getServiceSupabase();

  const member = await requireActiveMembership(supabase, threadId, auth.userId);
  if (!member) {
    return NextResponse.json({ success: false, message: "Thread access denied" }, { status: 403 });
  }

  let payload: { body: string; clientMessageId?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON payload" }, { status: 400 });
  }

  const body = normalizeMessageBody(payload.body);
  if (!body) {
    return NextResponse.json({ success: false, message: "Message body is required and must be <= 4000 chars" }, { status: 400 });
  }

  try {
    if (payload.clientMessageId) {
      const { data: existing } = await supabase
        .from("messages")
        .select("id, thread_id, sender_user_id, sender_role, body, created_at")
        .eq("thread_id", threadId)
        .eq("sender_user_id", auth.userId)
        .eq("client_message_id", payload.clientMessageId)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ success: true, data: existing, deduped: true });
      }
    }

    const { data: created, error: createError } = await supabase
      .from("messages")
      .insert({
        thread_id: threadId,
        sender_user_id: auth.userId,
        sender_role: auth.role,
        body,
        client_message_id: payload.clientMessageId || null,
      })
      .select("id, thread_id, sender_user_id, sender_role, body, client_message_id, created_at")
      .single();

    if (createError || !created) {
      logger.error("Failed to create message", createError);
      return NextResponse.json({ success: false, message: "Failed to send message" }, { status: 500 });
    }

    await supabase
      .from("message_threads")
      .update({
        last_message_at: created.created_at,
        updated_at: created.created_at,
      })
      .eq("id", threadId);

    const { data: recipients } = await supabase
      .from("message_thread_members")
      .select("user_id, role")
      .eq("thread_id", threadId)
      .eq("status", "active")
      .neq("user_id", auth.userId);

    if ((recipients || []).length > 0) {
      const outboxRows: Array<Record<string, unknown>> = [];
      for (const r of recipients || []) {
        outboxRows.push({
          message_id: created.id,
          recipient_user_id: r.user_id,
          recipient_role: r.role,
          channel: "email",
          status: "pending",
          send_after: new Date().toISOString(),
        });
        outboxRows.push({
          message_id: created.id,
          recipient_user_id: r.user_id,
          recipient_role: r.role,
          channel: "push",
          status: "pending",
          send_after: new Date().toISOString(),
        });
      }
      await supabase.from("notification_outbox").upsert(outboxRows, {
        onConflict: "message_id,recipient_user_id,channel",
        ignoreDuplicates: true,
      });
    }

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    logger.error("Create message failed", error);
    return NextResponse.json({ success: false, message: "Failed to send message" }, { status: 500 });
  }
}
