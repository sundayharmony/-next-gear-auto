import { logger } from "@/lib/utils/logger";
import { sendInternalMessageNotification } from "@/lib/email/mailer";
import {
  formatMessageListPreview,
  nextBackoffMinutes,
  resolveStaffIdentity,
  type StaffRole,
} from "@/lib/messaging/service";
import { sendWebPush } from "@/lib/notifications/push";
import {
  staffMessagingEmailChannelEnabled,
  staffMessagingPushChannelEnabled,
} from "@/lib/config/staff-messaging-server";
import { chooseOutboxDecision } from "@/lib/messaging/outbox-policy";

export type OutboxJobRow = {
  id: string;
  message_id: string;
  recipient_user_id: string;
  recipient_role: string;
  channel: string;
  status: string;
  attempts: number | null;
  max_attempts: number | null;
};

export type ProcessOutboxStats = { sent: number; retried: number; dead: number; failed: number };

/**
 * Process one outbox job (email or push): load message, send, update row.
 * Used by the cron worker and by immediate flush after a new message is posted.
 */
export async function processOutboxJob(supabase: any, job: OutboxJobRow): Promise<ProcessOutboxStats> {
  const stats: ProcessOutboxStats = { sent: 0, retried: 0, dead: 0, failed: 0 };
  const attempt = (job.attempts || 0) + 1;

  await supabase
    .from("notification_outbox")
    .update({ status: "processing", attempts: attempt })
    .eq("id", job.id)
    .in("status", ["pending", "retry"]);

  try {
    const { data: message } = await supabase
      .from("messages")
      .select("id, thread_id, sender_user_id, sender_role, body, created_at, metadata")
      .eq("id", job.message_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!message) {
      await supabase.from("notification_outbox").update({
        status: "dead",
        last_error: "message not found",
        updated_at: new Date().toISOString(),
      }).eq("id", job.id);
      stats.dead++;
      return stats;
    }

    const sender = await resolveStaffIdentity(supabase, message.sender_user_id, message.sender_role as StaffRole);
    const recipient = await resolveStaffIdentity(supabase, job.recipient_user_id, job.recipient_role as StaffRole);
    if (!sender || !recipient) {
      await supabase.from("notification_outbox").update({
        status: "dead",
        last_error: "sender/recipient not found",
        updated_at: new Date().toISOString(),
      }).eq("id", job.id);
      stats.dead++;
      return stats;
    }

    const { data: thread } = await supabase
      .from("message_threads")
      .select("id, title, thread_type")
      .eq("id", message.thread_id)
      .maybeSingle();

    const basePath = recipient.role === "manager" ? "/manager/messages" : "/admin/messages";
    const siteBase = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.rentnextgearauto.com").replace(/\/$/, "");
    const threadUrl = `${siteBase}${basePath}?thread=${message.thread_id}`;
    const meta = message.metadata as { image_urls?: string[] } | undefined;
    const text = (message.body || "").trim();
    let preview: string;
    if (text) {
      preview = text.length > 240 ? `${text.slice(0, 240)}...` : text;
    } else {
      preview = formatMessageListPreview("", meta) || "Photo";
    }
    const threadTitle = thread?.title || (thread?.thread_type === "dm" ? "Direct Message" : "Staff Channel");

    if (job.channel === "email") {
      if (!staffMessagingEmailChannelEnabled()) {
        await supabase.from("notification_outbox").update({
          status: "dead",
          last_error: "email notifications disabled",
          updated_at: new Date().toISOString(),
        }).eq("id", job.id);
        stats.dead++;
        return stats;
      }
      const recipientEmail = (recipient.email || "").trim();
      if (!recipientEmail) {
        await supabase.from("notification_outbox").update({
          status: "dead",
          last_error: "recipient has no email address in staff profile",
          updated_at: new Date().toISOString(),
        }).eq("id", job.id);
        stats.dead++;
        return stats;
      }
      await sendInternalMessageNotification({
        recipientEmail,
        recipientName: recipient.name,
        senderName: sender.name,
        senderRole: sender.role,
        threadTitle,
        messagePreview: preview,
        threadUrl,
      });
    } else {
      if (!staffMessagingPushChannelEnabled()) {
        await supabase.from("notification_outbox").update({
          status: "dead",
          last_error: "push notifications disabled",
          updated_at: new Date().toISOString(),
        }).eq("id", job.id);
        stats.dead++;
        return stats;
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
          const statusCode = (pushError as { statusCode?: number })?.statusCode || 0;
          const msg = pushError instanceof Error ? pushError.message : String(pushError);
          if (statusCode === 404 || statusCode === 410) {
            await supabase
              .from("push_subscriptions")
              .update({ active: false, last_error: `deactivated: ${msg}` })
              .eq("id", sub.id);
          } else {
            await supabase.from("push_subscriptions").update({ last_error: msg }).eq("id", sub.id);
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
    stats.sent++;
    return stats;
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
      stats.dead++;
    } else {
      const delay = nextBackoffMinutes(attempt);
      const sendAfter = new Date(Date.now() + delay * 60 * 1000).toISOString();
      await supabase.from("notification_outbox").update({
        status: "retry",
        send_after: sendAfter,
        last_error: errorMsg,
        updated_at: new Date().toISOString(),
      }).eq("id", job.id);
      stats.retried++;
    }
    stats.failed++;
    return stats;
  }
}

/**
 * Process all pending/retry outbox rows for a single message (e.g. right after POST /messages).
 * Does not throw on individual job failure; logs errors.
 */
export async function flushPendingNotificationsForMessage(supabase: any, messageId: string): Promise<ProcessOutboxStats> {
  const { data: jobs, error } = await supabase
    .from("notification_outbox")
    .select("id, message_id, recipient_user_id, recipient_role, channel, status, attempts, max_attempts")
    .eq("message_id", messageId)
    .in("status", ["pending", "retry"])
    .order("created_at", { ascending: true });

  if (error) {
    logger.error("flushPendingNotificationsForMessage: load jobs failed", error);
    return { sent: 0, retried: 0, dead: 0, failed: 0 };
  }

  const totals: ProcessOutboxStats = { sent: 0, retried: 0, dead: 0, failed: 0 };
  for (const job of jobs || []) {
    try {
      const s = await processOutboxJob(supabase, job as OutboxJobRow);
      totals.sent += s.sent;
      totals.retried += s.retried;
      totals.dead += s.dead;
      totals.failed += s.failed;
    } catch (e) {
      logger.error("flushPendingNotificationsForMessage: processOutboxJob threw", e);
    }
  }
  return totals;
}
