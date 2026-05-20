import { getTransporter, sendMailWithRetry } from "@/lib/email/mailer";
import { stripRichHtmlToText } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";

const SMTP_USER = process.env.SMTP_USER || "contact@rentnextgearauto.com";
const FROM_CUSTOMER = `"NextGearAuto" <${SMTP_USER}>`;

const SEND_DELAY_MS = 250;

export async function sendMarketingEmailToRecipient(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const transporter = getTransporter();
  await sendMailWithRetry(
    transporter,
    {
      from: FROM_CUSTOMER,
      to,
      subject,
      html,
      text: stripRichHtmlToText(html),
    },
    1,
  );
}

export async function sendMarketingCampaignBatch(
  recipients: string[],
  subject: string,
  html: string,
): Promise<{ sent: number; failed: { email: string; error: string }[] }> {
  const failed: { email: string; error: string }[] = [];
  let sent = 0;

  for (const email of recipients) {
    try {
      await sendMarketingEmailToRecipient(email, subject, html);
      sent += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Marketing email failed for", email, message);
      failed.push({ email, error: message });
    }
    if (SEND_DELAY_MS > 0) {
      await new Promise((resolve) => setTimeout(resolve, SEND_DELAY_MS));
    }
  }

  return { sent, failed };
}
