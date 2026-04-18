import { NextRequest, NextResponse } from "next/server";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";
import {
  batchResolveStaffIdentities,
  formatMessageListPreview,
  formatStaffDisplayName,
  normalizeThreadTitle,
  orderedDmPair,
  resolveStaffIdentity,
  staffIdentityKey,
  type StaffRole,
} from "@/lib/messaging/service";
import { staffMessagingMasterEnabled } from "@/lib/config/staff-messaging-server";

type CreateThreadBody =
  | { threadType: "dm"; peerUserId: string; peerRole: StaffRole }
  | { threadType: "channel"; title: string; members?: Array<{ userId: string; role: StaffRole }> };

type RpcDmRow = { thread_id: string; created_new: boolean };
type RpcUnreadRow = { thread_id: string; unread_count: number };

export async function GET(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;
  if (!staffMessagingMasterEnabled()) {
    return NextResponse.json({ success: true, data: [], messagingEnabled: false, viewer: { userId: auth.userId } });
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

    const threadIds = (memberships || []).map((m: { thread_id: string }) => m.thread_id);
    if (threadIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        messagingEnabled: true,
        viewer: { userId: auth.userId },
        unread_total: 0,
      });
    }

    const [{ data: threads }, { data: members }, { data: allMessages }] = await Promise.all([
      supabase
        .from("message_threads")
        .select(
          "id, thread_type, title, created_at, updated_at, last_message_at, created_by_user_id, created_by_role, dm_user_id_low, dm_user_id_high"
        )
        .in("id", threadIds)
        .order("last_message_at", { ascending: false }),
      supabase
        .from("message_thread_members")
        .select("thread_id, user_id, role, status")
        .in("thread_id", threadIds)
        .eq("status", "active"),
      supabase
        .from("messages")
        .select("id, thread_id, body, sender_user_id, sender_role, created_at, metadata")
        .in("thread_id", threadIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    const membersByThread = new Map<string, { thread_id: string; user_id: string; role: StaffRole }[]>();
    for (const member of members || []) {
      const bucket = membersByThread.get(member.thread_id) || [];
      bucket.push(member);
      membersByThread.set(member.thread_id, bucket);
    }

    const latestByThread = new Map<string, Record<string, unknown>>();
    for (const msg of allMessages || []) {
      if (!latestByThread.has(msg.thread_id)) latestByThread.set(msg.thread_id, msg);
    }

    type MembershipRow = { thread_id: string; last_read_at: string | null; muted: boolean };
    const membershipByThread = new Map<string, MembershipRow>(
      (memberships || []).map((m: MembershipRow) => [m.thread_id, m])
    );

    const unreadByThread = new Map<string, number>();
    const { data: unreadRpc, error: unreadRpcError } = await supabase.rpc("staff_message_thread_unread_counts", {
      p_user_id: auth.userId,
      p_thread_ids: threadIds,
    });

    if (!unreadRpcError && Array.isArray(unreadRpc)) {
      for (const row of unreadRpc as RpcUnreadRow[]) {
        unreadByThread.set(row.thread_id, Number(row.unread_count) || 0);
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
        unreadByThread.set(membership.thread_id, count || 0);
      }
    }

    const counterpartSpecs: { userId: string; role: StaffRole }[] = [];
    for (const thread of threads || []) {
      if (thread.thread_type !== "dm") continue;
      const tmembers = membersByThread.get(thread.id) || [];
      const other = tmembers.find((m) => m.user_id !== auth.userId);
      if (other) counterpartSpecs.push({ userId: other.user_id, role: other.role });
    }
    const identityMap = await batchResolveStaffIdentities(supabase, counterpartSpecs);

    const data = (threads || []).map((thread: Record<string, unknown>) => {
      const tmembers = membersByThread.get(thread.id as string) || [];
      let display_title: string;
      let counterpart: { id: string; role: StaffRole; name: string; email: string } | null = null;

      if (thread.thread_type === "dm") {
        const other = tmembers.find((m) => m.user_id !== auth.userId);
        if (other) {
          const ident = identityMap.get(staffIdentityKey(other.role, other.user_id));
          if (ident) {
            counterpart = { id: ident.id, role: ident.role, name: ident.name, email: ident.email };
            display_title = formatStaffDisplayName(ident);
          } else {
            display_title = other.user_id;
          }
        } else {
          display_title = "Direct message";
        }
      } else {
        display_title = (thread.title as string) || "Channel";
      }

      const latest = latestByThread.get(thread.id as string) as
        | {
            id: string;
            body: string;
            sender_user_id: string;
            sender_role: string;
            created_at: string;
            metadata?: { image_urls?: string[] };
          }
        | undefined;
      const last_message = latest
        ? {
            ...latest,
            preview: formatMessageListPreview(latest.body, latest.metadata),
          }
        : null;

      return {
        ...thread,
        display_title,
        counterpart,
        unread_count: unreadByThread.get(thread.id as string) || 0,
        muted: membershipByThread.get(thread.id as string)?.muted || false,
        last_message,
        members: tmembers,
      };
    });

    const unread_total = data.reduce((s, t: { unread_count?: number }) => s + (t.unread_count || 0), 0);

    return NextResponse.json({
      success: true,
      data,
      messagingEnabled: true,
      viewer: { userId: auth.userId },
      unread_total,
    });
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

      const [low, high] = orderedDmPair(auth.userId, body.peerUserId);

      const { data: rpcRows, error: rpcError } = await supabase.rpc("staff_get_or_create_dm_thread", {
        p_low: low,
        p_high: high,
        p_creator_user_id: auth.userId,
        p_creator_role: auth.role,
        p_peer_user_id: body.peerUserId,
        p_peer_role: body.peerRole,
      });

      if (rpcError) {
        logger.error("staff_get_or_create_dm_thread RPC failed", rpcError);
        return NextResponse.json(
          {
            success: false,
            message:
              "Failed to create or load DM thread. Ensure supabase-internal-messaging-dm-pair.sql has been applied.",
          },
          { status: 500 }
        );
      }

      const row = (Array.isArray(rpcRows) ? rpcRows[0] : rpcRows) as RpcDmRow | undefined;
      if (!row?.thread_id) {
        return NextResponse.json({ success: false, message: "Failed to resolve DM thread" }, { status: 500 });
      }

      const { data: fullThread, error: loadErr } = await supabase
        .from("message_threads")
        .select("id, thread_type, title, created_at, dm_user_id_low, dm_user_id_high")
        .eq("id", row.thread_id)
        .maybeSingle();

      if (loadErr || !fullThread) {
        logger.error("Failed to load DM thread after RPC", loadErr);
        return NextResponse.json({ success: false, message: "Failed to load thread" }, { status: 500 });
      }

      const reused = !row.created_new;
      const status = reused ? 200 : 201;
      return NextResponse.json(
        {
          success: true,
          data: {
            id: fullThread.id,
            reused,
            thread_type: fullThread.thread_type,
            title: fullThread.title,
            created_at: fullThread.created_at,
          },
        },
        { status }
      );
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
      return NextResponse.json({ success: false, message: "Failed to create thread" }, { status: 500 });
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
