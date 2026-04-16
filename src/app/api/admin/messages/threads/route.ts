import { NextRequest, NextResponse } from "next/server";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";
import { normalizeThreadTitle, resolveStaffIdentity, type StaffRole } from "@/lib/messaging/service";
import { staffMessagingMasterEnabled } from "@/lib/config/staff-messaging-server";

type CreateThreadBody =
  | { threadType: "dm"; peerUserId: string; peerRole: StaffRole }
  | { threadType: "channel"; title: string; members?: Array<{ userId: string; role: StaffRole }> };

export async function GET(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;
  if (!staffMessagingMasterEnabled()) {
    return NextResponse.json({ success: true, data: [], messagingEnabled: false });
  }
  const supabase = getServiceSupabase();

  try {
    const { data: memberships, error: membershipsError } = await supabase
      .from("message_thread_members")
      .select("thread_id, last_read_at, muted")
      .eq("user_id", auth.userId)
      .eq("status", "active");

    if (membershipsError) {
      logger.error("Failed to list memberships", membershipsError);
      return NextResponse.json({ success: false, message: "Failed to load threads" }, { status: 500 });
    }

    const threadIds = (memberships || []).map((m: any) => m.thread_id);
    if (threadIds.length === 0) {
      return NextResponse.json({ success: true, data: [], messagingEnabled: true });
    }

    const [{ data: threads }, { data: members }, { data: allMessages }] = await Promise.all([
      supabase
        .from("message_threads")
        .select("id, thread_type, title, created_at, updated_at, last_message_at, created_by_user_id, created_by_role")
        .in("id", threadIds)
        .order("last_message_at", { ascending: false }),
      supabase
        .from("message_thread_members")
        .select("thread_id, user_id, role, status")
        .in("thread_id", threadIds)
        .eq("status", "active"),
      supabase
        .from("messages")
        .select("id, thread_id, body, sender_user_id, sender_role, created_at")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    const membersByThread = new Map<string, any[]>();
    for (const member of members || []) {
      const bucket = membersByThread.get(member.thread_id) || [];
      bucket.push(member);
      membersByThread.set(member.thread_id, bucket);
    }

    const latestByThread = new Map<string, any>();
    for (const msg of allMessages || []) {
      if (!latestByThread.has(msg.thread_id)) latestByThread.set(msg.thread_id, msg);
    }

    const membershipByThread = new Map<string, any>((memberships || []).map((m: any) => [m.thread_id, m]));

    const unreadByThread = new Map<string, number>();
    for (const membership of memberships || []) {
      let q = supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("thread_id", membership.thread_id)
        .neq("sender_user_id", auth.userId);
      if (membership.last_read_at) q = q.gt("created_at", membership.last_read_at);
      const { count } = await q;
      unreadByThread.set(membership.thread_id, count || 0);
    }

    const data = (threads || []).map((thread: any) => ({
      ...thread,
      unread_count: unreadByThread.get(thread.id) || 0,
      muted: membershipByThread.get(thread.id)?.muted || false,
      last_message: latestByThread.get(thread.id) || null,
      members: membersByThread.get(thread.id) || [],
    }));

    return NextResponse.json({ success: true, data, messagingEnabled: true });
  } catch (error) {
    logger.error("List threads failed", error);
    return NextResponse.json({ success: false, message: "Failed to load threads" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;
  if (!staffMessagingMasterEnabled()) {
    return NextResponse.json({ success: false, message: "Staff messaging is disabled" }, { status: 403 });
  }
  const supabase = getServiceSupabase();

  let body: CreateThreadBody;
  try {
    body = (await req.json()) as CreateThreadBody;
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON payload" }, { status: 400 });
  }

  try {
    if (body.threadType === "dm") {
      if (!body.peerUserId || !body.peerRole) {
        return NextResponse.json({ success: false, message: "peerUserId and peerRole are required" }, { status: 400 });
      }
      if (body.peerUserId === auth.userId) {
        return NextResponse.json({ success: false, message: "Cannot create a DM with yourself" }, { status: 400 });
      }

      const peer = await resolveStaffIdentity(supabase, body.peerUserId, body.peerRole);
      if (!peer) return NextResponse.json({ success: false, message: "Peer user not found" }, { status: 404 });

      const { data: myThreadIds } = await supabase
        .from("message_thread_members")
        .select("thread_id")
        .eq("user_id", auth.userId)
        .eq("status", "active");
      const candidateIds = (myThreadIds || []).map((r: any) => r.thread_id);
      if (candidateIds.length > 0) {
        const { data: dmThreads } = await supabase
          .from("message_threads")
          .select("id")
          .in("id", candidateIds)
          .eq("thread_type", "dm");
        const dmIds = (dmThreads || []).map((d: any) => d.id);
        if (dmIds.length > 0) {
          const { data: dmMembers } = await supabase
            .from("message_thread_members")
            .select("thread_id, user_id")
            .in("thread_id", dmIds)
            .eq("status", "active");
          const grouped = new Map<string, Set<string>>();
          for (const row of dmMembers || []) {
            const set = grouped.get(row.thread_id) || new Set<string>();
            set.add(row.user_id);
            grouped.set(row.thread_id, set);
          }
          for (const [threadId, set] of grouped) {
            if (set.size === 2 && set.has(auth.userId) && set.has(body.peerUserId)) {
              return NextResponse.json({ success: true, data: { id: threadId, reused: true } });
            }
          }
        }
      }

      const { data: thread, error: threadError } = await supabase
        .from("message_threads")
        .insert({
          thread_type: "dm",
          created_by_user_id: auth.userId,
          created_by_role: auth.role,
          title: null,
        })
        .select("id, thread_type, title, created_at")
        .single();
      if (threadError || !thread) {
        logger.error("Failed to create DM thread", threadError);
        return NextResponse.json({ success: false, message: "Failed to create thread" }, { status: 500 });
      }

      const { error: membersError } = await supabase.from("message_thread_members").insert([
        { thread_id: thread.id, user_id: auth.userId, role: auth.role, status: "active" },
        { thread_id: thread.id, user_id: body.peerUserId, role: body.peerRole, status: "active" },
      ]);
      if (membersError) {
        logger.error("Failed to insert DM members", membersError);
        return NextResponse.json({ success: false, message: "Failed to create thread members" }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: thread }, { status: 201 });
    }

    const title = normalizeThreadTitle(body.title);
    if (!title) return NextResponse.json({ success: false, message: "A valid channel title is required" }, { status: 400 });

    const uniqueMembers = new Map<string, { userId: string; role: StaffRole }>();
    uniqueMembers.set(`${auth.role}:${auth.userId}`, { userId: auth.userId, role: auth.role });
    for (const m of body.members || []) {
      if (!m?.userId || (m.role !== "admin" && m.role !== "manager")) continue;
      uniqueMembers.set(`${m.role}:${m.userId}`, { userId: m.userId, role: m.role });
    }

    for (const member of uniqueMembers.values()) {
      const resolved = await resolveStaffIdentity(supabase, member.userId, member.role);
      if (!resolved) {
        return NextResponse.json({ success: false, message: `Staff member not found: ${member.role}/${member.userId}` }, { status: 404 });
      }
    }

    const { data: thread, error: threadError } = await supabase
      .from("message_threads")
      .insert({
        thread_type: "channel",
        title,
        created_by_user_id: auth.userId,
        created_by_role: auth.role,
      })
      .select("id, thread_type, title, created_at")
      .single();
    if (threadError || !thread) {
      logger.error("Failed to create channel thread", threadError);
      return NextResponse.json({ success: false, message: "Failed to create channel" }, { status: 500 });
    }

    const membersPayload = Array.from(uniqueMembers.values()).map((member) => ({
      thread_id: thread.id,
      user_id: member.userId,
      role: member.role,
      status: "active",
    }));
    const { error: memberError } = await supabase.from("message_thread_members").insert(membersPayload);
    if (memberError) {
      logger.error("Failed to create channel members", memberError);
      return NextResponse.json({ success: false, message: "Failed to create channel members" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: thread }, { status: 201 });
  } catch (error) {
    logger.error("Create thread failed", error);
    return NextResponse.json({ success: false, message: "Failed to create thread" }, { status: 500 });
  }
}
