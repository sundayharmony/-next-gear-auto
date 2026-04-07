import nodemailer from "nodemailer";
import { logger } from "@/lib/utils/logger";
import { escapeHtml } from "@/lib/utils/validation";
import {
  bookingConfirmationTemplate,
  bookingPendingTemplate,
  adminNewBookingTemplate,
  cancellationTemplate,
  pickupReminderTemplate,
  returnReminderTemplate,
  passwordResetTemplate,
  bookingSignAgreementTemplate,
  bookingExtendedTemplate,
  fmtDate,
  fmtTime,
} from "./templates";

const SMTP_USER = process.env.SMTP_USER || "contact@rentnextgearauto.com";
const FROM_CUSTOMER = `"NextGearAuto" <${SMTP_USER}>`;
const FROM_SYSTEM = `"NextGearAuto System" <${SMTP_USER}>`;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "contact@rentnextgearauto.com";

// Warn if SMTP variables are missing in development
if (process.env.NODE_ENV !== "production") {
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn("SMTP environment variables not configured — emails may fail");
  }
}

// Lazy-initialized singleton transporter
let _transporter: nodemailer.Transporter | null = null;
export function getTransporter() {
  if (!_transporter) {
    const port = parseInt(process.env.SMTP_PORT || "465", 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid SMTP_PORT: ${process.env.SMTP_PORT}`);
    }
    const smtpPass = process.env.SMTP_PASS;
    if (!smtpPass && process.env.NODE_ENV === "production") {
      throw new Error("SMTP_PASS environment variable is required in production");
    }
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.hostinger.com",
      port,
      secure: port === 465, // port 465 = SSL
      auth: {
        user: SMTP_USER,
        pass: smtpPass || "",
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 30000, // 30s timeout for the actual send operation
    });
  }
  return _transporter;
}

// Strip HTML tags for plain text fallback
function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// Retry logic for transient email errors
// NOTE: maxRetries parameter is confusing — it's actually the max number of retry attempts (0-based).
// maxRetries=1 means try once + 1 retry = 2 total attempts.
async function sendMailWithRetry(
  transporter: nodemailer.Transporter,
  mailOptions: nodemailer.SendMailOptions,
  maxRetries: number = 1
): Promise<void> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await transporter.sendMail(mailOptions);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorCode = (error as any)?.code || lastError.message;
      const isTransient =
        errorCode === "ECONNREFUSED" ||
        errorCode === "ETIMEDOUT" ||
        errorCode === "EHOSTUNREACH" ||
        errorCode === "421" ||
        errorCode === "450" ||
        errorCode === "451";
      if (!isTransient || attempt === maxRetries) {
        throw lastError;
      }
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  throw lastError || new Error("Failed to send email after retries");
}

interface BookingEmailData {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  vehicleName: string;
  pickupDate: string;
  returnDate: string;
  pickupTime?: string;
  returnTime?: string;
  totalPrice: number;
  deposit: number;
  needsPassword?: boolean;
}

async function enrichWithPasswordToken(data: BookingEmailData): Promise<BookingEmailData & { passwordToken?: string }> {
  if (data.needsPassword && data.customerEmail) {
    const { generatePasswordToken } = await import("@/lib/auth/password-token");
    return { ...data, passwordToken: generatePasswordToken(data.customerEmail) };
  }
  return data;
}

export async function sendBookingConfirmation(data: BookingEmailData) {
  try {
    const enriched = await enrichWithPasswordToken(data);
    const transporter = getTransporter();
    const html = bookingConfirmationTemplate(enriched);
    await sendMailWithRetry(transporter, {
      from: FROM_CUSTOMER,
      to: data.customerEmail,
      bcc: ADMIN_EMAIL,
      subject: `Booking Confirmed - ${data.bookingId}`,
      html,
      text: stripHtmlTags(html),
    });
    logger.info("Confirmation email sent successfully");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error("Failed to send confirmation email:", errorMsg);
    throw error;
  }
}

export async function sendBookingPendingEmail(data: BookingEmailData) {
  try {
    const enriched = await enrichWithPasswordToken(data);
    const transporter = getTransporter();
    const html = bookingPendingTemplate(enriched);
    await sendMailWithRetry(transporter, {
      from: FROM_CUSTOMER,
      to: data.customerEmail,
      bcc: ADMIN_EMAIL,
      subject: `Booking Received - ${data.bookingId}`,
      html,
      text: stripHtmlTags(html),
    });
    logger.info("Pending booking email sent successfully");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error("Failed to send pending booking email:", errorMsg);
    throw error;
  }
}

export async function sendAdminNewBooking(data: BookingEmailData) {
  try {
    const transporter = getTransporter();
    const html = adminNewBookingTemplate(data);
    await sendMailWithRetry(transporter, {
      from: FROM_SYSTEM,
      to: ADMIN_EMAIL,
      subject: `New Booking: ${data.bookingId} - ${data.vehicleName}`,
      html,
      text: stripHtmlTags(html),
    });
    logger.info("Admin notification sent for booking:", data.bookingId);
  } catch (error) {
    logger.error("Failed to send admin notification:", error);
    throw error;
  }
}

export async function sendCancellationEmail(data: BookingEmailData) {
  try {
    const transporter = getTransporter();
    const html = cancellationTemplate(data);
    // Send to customer with admin BCC
    await sendMailWithRetry(transporter, {
      from: FROM_CUSTOMER,
      to: data.customerEmail,
      bcc: ADMIN_EMAIL,
      subject: `Booking Cancelled - ${data.bookingId}`,
      html,
      text: stripHtmlTags(html),
    });
    logger.info("Cancellation email sent successfully");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error("Failed to send cancellation email:", errorMsg);
    throw error;
  }
}

export async function sendPickupReminder(data: BookingEmailData) {
  try {
    const transporter = getTransporter();
    const html = pickupReminderTemplate(data);
    await sendMailWithRetry(transporter, {
      from: FROM_CUSTOMER,
      to: data.customerEmail,
      bcc: ADMIN_EMAIL,
      subject: `Pickup Reminder - Your ${data.vehicleName} is Ready!`,
      html,
      text: stripHtmlTags(html),
    });
    logger.info("Pickup reminder email sent successfully");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error("Failed to send pickup reminder:", errorMsg);
    throw error;
  }
}

export async function sendAgreementEmail(data: BookingEmailData & { pdfBytes: Uint8Array }) {
  try {
    if (!data.pdfBytes || data.pdfBytes.length === 0) {
      throw new Error("Cannot send agreement email: PDF bytes are empty");
    }
    if (!data.customerEmail) {
      throw new Error("Cannot send agreement email: no customer email");
    }
    // Validate PDF size before sending (Bug 21)
    if (data.pdfBytes.length > 10 * 1024 * 1024) {
      throw new Error("PDF too large to email");
    }
    const transporter = getTransporter();
    const html = agreementEmailTemplate(data);
    await sendMailWithRetry(transporter, {
      from: FROM_CUSTOMER,
      to: data.customerEmail,
      bcc: ADMIN_EMAIL,
      subject: `Your Signed Rental Agreement - ${data.bookingId}`,
      html,
      text: stripHtmlTags(html),
      attachments: [
        {
          filename: `Rental-Agreement-${data.bookingId}.pdf`,
          content: Buffer.from(data.pdfBytes),
          contentType: "application/pdf",
        },
      ],
    });
    logger.info("Agreement email sent successfully");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error("Failed to send agreement email:", errorMsg);
    throw error;
  }
}

function agreementEmailTemplate(data: BookingEmailData): string {
  const name = escapeHtml(data.customerName);
  const vehicle = escapeHtml(data.vehicleName);
  const bId = escapeHtml(data.bookingId);
  const fmtTimeAt = (t?: string) => {
    const formatted = fmtTime(t);
    return formatted ? ` at ${formatted}` : "";
  };

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="Content-Language" content="en"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
  <tr><td style="background:linear-gradient(135deg,#7C3AED,#5B21B6);padding:32px 40px;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">Signed Rental Agreement</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Booking ${bId}</p>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <p style="margin:0 0 16px;font-size:16px;color:#1f2937;">Hi ${name},</p>
    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;">Your signed rental agreement is attached to this email as a PDF. Please keep this for your records.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 8px;font-size:13px;color:#6b7280;text-transform:uppercase;font-weight:600;">Vehicle</p>
        <p style="margin:0 0 16px;font-size:16px;color:#1f2937;font-weight:600;">${vehicle}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Pickup: <strong style="color:#1f2937;">${fmtDate(data.pickupDate)}${fmtTimeAt(data.pickupTime)}</strong></p>
        <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Return: <strong style="color:#1f2937;">${fmtDate(data.returnDate)}${fmtTimeAt(data.returnTime)}</strong></p>
        <p style="margin:0;font-size:13px;color:#6b7280;">Total: <strong style="color:#7C3AED;">$${(() => {
          const safeTotalPrice = Number.isFinite(data.totalPrice) ? data.totalPrice : 0;
          return safeTotalPrice.toFixed(2);
        })()}</strong></p>
      </td></tr>
    </table>
    <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">If you have any questions, reply to this email or call us.</p>
  </td></tr>
  <tr><td style="padding:24px 40px;background:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;font-size:13px;color:#9ca3af;">NextGearAuto &bull; <a href="https://rentnextgearauto.com" style="color:#7C3AED;text-decoration:none;">rentnextgearauto.com</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

export async function sendReturnReminder(data: BookingEmailData) {
  try {
    const transporter = getTransporter();
    const html = returnReminderTemplate(data);
    await sendMailWithRetry(transporter, {
      from: FROM_CUSTOMER,
      to: data.customerEmail,
      bcc: ADMIN_EMAIL,
      subject: `Return Reminder - ${data.vehicleName} due today`,
      html,
      text: stripHtmlTags(html),
    });
    logger.info("Return reminder email sent successfully");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error("Failed to send return reminder:", errorMsg);
    throw error;
  }
}

export async function sendBookingSignAgreement(data: BookingEmailData) {
  try {
    const transporter = getTransporter();
    const html = bookingSignAgreementTemplate(data);
    await sendMailWithRetry(transporter, {
      from: FROM_CUSTOMER,
      to: data.customerEmail,
      bcc: ADMIN_EMAIL,
      subject: `Your Booking Details - Please Sign Agreement | ${data.bookingId}`,
      html,
      text: stripHtmlTags(html),
    });
    logger.info("Booking sign-agreement email sent successfully");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error("Failed to send booking sign-agreement email:", errorMsg);
    throw error;
  }
}

export async function sendPasswordResetLink(data: { customerName: string; customerEmail: string }) {
  try {
    // Generate a cryptographic token for the set-password link
    const { generatePasswordToken } = await import("@/lib/auth/password-token");
    const token = generatePasswordToken(data.customerEmail);

    const transporter = getTransporter();
    const html = passwordResetTemplate({ ...data, token });
    await sendMailWithRetry(transporter, {
      from: FROM_CUSTOMER,
      to: data.customerEmail,
      bcc: ADMIN_EMAIL,
      subject: "Set Your Password - NextGearAuto",
      html,
      text: stripHtmlTags(html),
    });
    logger.info("Password reset link email sent successfully");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error("Failed to send password reset link:", errorMsg);
    throw error;
  }
}

interface ExtensionEmailData {
  bookingId: string;
  customerName: string;
  vehicleName: string;
  pickupDate: string;
  originalReturnDate: string;
  newReturnDate: string;
  newReturnTime?: string;
  extensionDays: number;
  extensionAmount: number;
  newTotalPrice: number;
  paymentLink?: string;
}

export async function sendBookingExtended(data: ExtensionEmailData & { customerEmail: string }) {
  try {
    const transporter = getTransporter();
    const html = bookingExtendedTemplate(data);
    const subject = `Trip Extended – ${escapeHtml(data.vehicleName)} (${data.extensionDays} extra day${data.extensionDays > 1 ? "s" : ""})`;

    await sendMailWithRetry(transporter, {
      from: FROM_CUSTOMER,
      to: data.customerEmail,
      bcc: ADMIN_EMAIL,
      subject,
      html,
      text: stripHtmlTags(html),
      headers: { "Content-Language": "en-US" },
    });
    logger.info("Booking extended email sent successfully");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error("Failed to send booking extended email:", errorMsg);
    throw error;
  }
}
