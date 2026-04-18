import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";
import { processOutboxJob, type OutboxJobRow } from "@/lib/messaging/outbox-worker";
import { staffMessagingMasterEnabled } from "@/lib/config/staff-messaging-server";

export async function GET(req: NextRequest) {
  if (!staffMessagingMasterEnabled()) {
    return NextResponse.json({ success: true, skipped: true, reason: "staff messaging disabled" });
  }
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ success: false, message: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const nowIso = new Date().toISOString();

  try {
    const { data: jobs, error: jobsError } = await supabase
      .from("notification_outbox")
      .select("id, message_id, recipient_user_id, recipient_role, channel, status, attempts, max_attempts")
      .in("status", ["pending", "retry"])
      .lte("send_after", nowIso)
      .order("created_at", { ascending: true })
      .limit(100);

    if (jobsError) {
      logger.error("Failed to load outbox jobs", jobsError);
      return NextResponse.json({ success: false, message: "Failed to load outbox" }, { status: 500 });
    }

    let sent = 0;
    let retried = 0;
    let dead = 0;
    let failed = 0;

    for (const job of jobs || []) {
      const s = await processOutboxJob(supabase, job as OutboxJobRow);
      sent += s.sent;
      retried += s.retried;
      dead += s.dead;
      failed += s.failed;
    }

    return NextResponse.json({
      success: true,
      processed: (jobs || []).length,
      sent,
      retried,
      dead,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Message notifications cron failed", error);
    return NextResponse.json({ success: false, message: "Message notification worker failed" }, { status: 500 });
  }
}
