import { NextRequest, NextResponse } from "next/server";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";
import { staffMessagingPushChannelEnabled } from "@/lib/config/staff-messaging-server";

interface PushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;
  if (!staffMessagingPushChannelEnabled()) {
    return NextResponse.json({ success: false, message: "Push messaging is disabled" }, { status: 403 });
  }
  const supabase = getServiceSupabase();

  let body: PushSubscriptionPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON payload" }, { status: 400 });
  }

  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return NextResponse.json({ success: false, message: "endpoint and keys are required" }, { status: 400 });
  }

  const userAgent = req.headers.get("user-agent") || "";
  const platform = /iphone|ipad|ios/i.test(userAgent)
    ? "ios"
    : /android/i.test(userAgent)
      ? "android"
      : "web";

  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        user_id: auth.userId,
        role: auth.role,
        user_agent: userAgent.slice(0, 512),
        platform,
        active: true,
      },
      { onConflict: "endpoint" }
    )
    .select("id, endpoint, active, platform, created_at")
    .single();

  if (error) {
    logger.error("Failed to save push subscription", error);
    return NextResponse.json({ success: false, message: "Failed to save subscription" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;
  if (!staffMessagingPushChannelEnabled()) {
    return NextResponse.json({ success: false, message: "Push messaging is disabled" }, { status: 403 });
  }
  const supabase = getServiceSupabase();

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const endpoint = url.searchParams.get("endpoint");
  if (!id && !endpoint) {
    return NextResponse.json({ success: false, message: "id or endpoint is required" }, { status: 400 });
  }

  let query = supabase
    .from("push_subscriptions")
    .update({ active: false, last_error: "unsubscribed by user" })
    .eq("user_id", auth.userId);

  query = id ? query.eq("id", id) : query.eq("endpoint", endpoint!);

  const { data, error } = await query.select("id, endpoint, active");
  if (error) {
    logger.error("Failed to delete push subscription", error);
    return NextResponse.json({ success: false, message: "Failed to unsubscribe" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data || [] });
}
