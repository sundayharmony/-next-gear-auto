import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";
import { sendInternalMessageNotification } from "@/lib/email/mailer";
import { nextBackoffMinutes, resolveStaffIdentity, type StaffRole } from "@/lib/messaging/service";
import { sendWebPush } from "@/lib/notifications/push";
import { isStaffMessagingEnabled } from "@/lib/config/feature-flags";
import { chooseOutboxDecision } from "@/lib/messaging/outbox-policy";

export async function GET(req: NextRequest) {
  if (!isStaffMessagingEnabled("staffMessagingEnabled")) {
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
      const attempt = (job.attempts || 0) + 1;
      await supabase
        .from("notification_outbox")
        .update({ status: "processing", attempts: attempt })
        .eq("id", job.id)
        .in("status", ["pending", "retry"]);

      try {
        const { data: message } = await supabase
          .from("messages")
          .select("id, thread_id, sender_user_id, sender_role, body, created_at")
          .eq("id", job.message_id)
          .maybeSingle();
        if (!message) {
          await supabase.from("notification_outbox").update({
            status: "dead",
            last_error: "message not found",
            updated_at: new Date().toISOString(),
          }).eq("id", job.id);
          dead++;
          continue;
        }

        const sender = await resolveStaffIdentity(supabase, message.sender_user_id, message.sender_role as StaffRole);
        const recipient = await resolveStaffIdentity(supabase, job.recipient_user_id, job.recipient_role as StaffRole);
        if (!sender || !recipient) {
          await supabase.from("notification_outbox").update({
            status: "dead",
            last_error: "sender/recipient not found",
            updated_at: new Date().toISOString(),
          }).eq("id", job.id);
          dead++;
          continue;
        }

        const { data: thread } = await supabase
          .from("message_threads")
          .select("id, title, thread_type")
          .eq("id", message.thread_id)
          .maybeSingle();
        const basePath = recipient.role === "manager" ? "/manager/messages" : "/admin/messages";
        const threadUrl = `https://rentnextgearauto.com${basePath}?thread=${message.thread_id}`;
        const preview = message.body.length > 240 ? `${message.body.slice(0, 240)}...` : message.body;

        if (job.channel === "email") {
          if (!isStaffMessagingEnabled("staffMessagingEmailEnabled")) {
            await supabase.from("notification_outbox").update({
              status: "dead",
              last_error: "email notifications disabled",
              updated_at: new Date().toISOString(),
            }).eq("id", job.id);
            dead++;
            continue;
          }
          await sendInternalMessageNotification({
            recipientEmail: recipient.email,
            recipientName: recipient.name,
            senderName: sender.name,
            senderRole: sender.role,
            threadTitle: thread?.title || (thread?.thread_type === "dm" ? "Direct Message" : "Staff Channel"),
            messagePreview: preview,
            threadUrl,
          });
        } else {
          if (!isStaffMessagingEnabled("staffMessagingPushEnabled")) {
            await supabase.from("notification_outbox").update({
              status: "dead",
              last_error: "push notifications disabled",
              updated_at: new Date().toISOString(),
            }).eq("id", job.id);
            dead++;
            continue;
          }
          const { data: subscriptions } = await supabase
            .from("push_subscriptions")
            .select("id, endpoint, p256dh, auth")
            .eq("user_id", recipient.id)
            .eq("active", true);

          if (!subscriptions || subscriptions.length === 0) {
            throw new Error("No active push subscriptions");
          }

          let delivered = false;
          for (const sub of subscriptions) {
            try {
              await sendWebPush(
                {
                  endpoint: sub.endpoint,
                  keys: { p256dh: sub.p256dh, auth: sub.auth },
                },
                {
                  title: `${sender.name} sent a message`,
                  body: preview,
                  url: threadUrl,
                  icon: "/images/icons/icon-192.png",
                  badge: "/images/icons/icon-192.png",
                  tag: `thread-${message.thread_id}`,
                }
              );

              delivered = true;
              await supabase
                .from("push_subscriptions")
                .update({ last_success_at: new Date().toISOString(), last_error: null })
                .eq("id", sub.id);
            } catch (pushError) {
              const statusCode = (pushError as any)?.statusCode || 0;
              const msg = pushError instanceof Error ? pushError.message : String(pushError);
              if (statusCode === 404 || statusCode === 410) {
                await supabase
                  .from("push_subscriptions")
                  .update({ active: false, last_error: `deactivated: ${msg}` })
                  .eq("id", sub.id);
              } else {
                await supabase
                  .from("push_subscriptions")
                  .update({ last_error: msg })
                  .eq("id", sub.id);
              }
            }
          }

          if (!delivered) {
            throw new Error("Push not delivered to any active subscription");
          }
        }

        await supabase.from("notification_outbox").update({
          status: "sent",
          sent_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        }).eq("id", job.id);
        sent++;
      } catch (error) {
        const maxAttempts = job.max_attempts || 5;
        const errorMsg = error instanceof Error ? error.message : String(error);
        const decision = chooseOutboxDecision(error, attempt, maxAttempts);
        if (decision === "dead") {
          await supabase.from("notification_outbox").update({
            status: "dead",
            last_error: errorMsg,
            updated_at: new Date().toISOString(),
          }).eq("id", job.id);
          dead++;
        } else {
          const delay = nextBackoffMinutes(attempt);
          const sendAfter = new Date(Date.now() + delay * 60 * 1000).toISOString();
          await supabase.from("notification_outbox").update({
            status: "retry",
            send_after: sendAfter,
            last_error: errorMsg,
            updated_at: new Date().toISOString(),
          }).eq("id", job.id);
          retried++;
        }
        failed++;
      }
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
