import nodemailer from "nodemailer";
import {
  bookingConfirmationTemplate,
  bookingPendingTemplate,
  adminNewBookingTemplate,
  cancellationTemplate,
  pickupReminderTemplate,
  returnReminderTemplate,
  passwordResetTemplate,
  fmtDate,
  fmtTime,
} from "./templates";

const SMTP_USER = process.env.SMTP_USER || "contact@rentnextgearauto.com";
const FROM_CUSTOMER = `"NextGearAuto" <${SMTP_USER}>`;
const FROM_SYSTEM = `"NextGearAuto System" <${SMTP_USER}>`;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "contact@rentnextgearauto.com";

// Lazy-initialized singleton transporter
let _transporter: nodemailer.Transporter | null = null;
export function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.hostinger.com",
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: true, // port 465 = SSL
      auth: {
        user: SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return _transporter;
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

export async function sendBookingConfirmation(data: BookingEmailData) {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: FROM_CUSTOMER,
      to: data.customerEmail,
      subject: `Booking Confirmed - ${data.bookingId}`,
      html: bookingConfirmationTemplate(data),
    });
    console.log("Confirmation email sent to:", data.customerEmail);
  } catch (error) {
    console.error("Failed to send confirmation email:", error);
    throw error;
  }
}

export async function sendBookingPendingEmail(data: BookingEmailData) {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: FROM_CUSTOMER,
      to: data.customerEmail,
      subject: `Booking Received - ${data.bookingId}`,
      html: bookingPendingTemplate(data),
    });
    console.log("Pending booking email sent to:", data.customerEmail);
  } catch (error) {
    console.error("Failed to send pending booking email:", error);
    throw error;
  }
}

export async function sendAdminNewBooking(data: BookingEmailData) {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: FROM_SYSTEM,
      to: ADMIN_EMAIL,
      subject: `New Booking: ${data.bookingId} - ${data.vehicleName}`,
      html: adminNewBookingTemplate(data),
    });
    console.log("Admin notification sent for booking:", data.bookingId);
  } catch (error) {
    console.error("Failed to send admin notification:", error);
    throw error;
  }
}

export async function sendCancellationEmail(data: BookingEmailData) {
  try {
    const transporter = getTransporter();
    // Send to customer
    await transporter.sendMail({
      from: FROM_CUSTOMER,
      to: data.customerEmail,
      subject: `Booking Cancelled - ${data.bookingId}`,
      html: cancellationTemplate(data),
    });
    // Send to admin
    await transporter.sendMail({
      from: FROM_SYSTEM,
      to: ADMIN_EMAIL,
      subject: `Booking Cancelled: ${data.bookingId}`,
      html: cancellationTemplate(data),
    });
    console.log("Cancellation emails sent for booking:", data.bookingId);
  } catch (error) {
    console.error("Failed to send cancellation email:", error);
    throw error;
  }
}

export async function sendPickupReminder(data: BookingEmailData) {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: FROM_CUSTOMER,
      to: data.customerEmail,
      subject: `Pickup Reminder - Your ${data.vehicleName} is Ready!`,
      html: pickupReminderTemplate(data),
    });
    console.log("Pickup reminder sent to:", data.customerEmail);
  } catch (error) {
    console.error("Failed to send pickup reminder:", error);
    throw error;
  }
}

export async function sendAgreementEmail(data: BookingEmailData & { pdfBytes: Uint8Array }) {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: FROM_CUSTOMER,
      to: data.customerEmail,
      subject: `Your Signed Rental Agreement - ${data.bookingId}`,
      html: agreementEmailTemplate(data),
      attachments: [
        {
          filename: `Rental-Agreement-${data.bookingId}.pdf`,
          content: Buffer.from(data.pdfBytes),
          contentType: "application/pdf",
        },
      ],
    });
    console.log("Agreement email sent to:", data.customerEmail);
  } catch (error) {
    console.error("Failed to send agreement email:", error);
    throw error;
  }
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function agreementEmailTemplate(data: BookingEmailData): string {
  const name = escHtml(data.customerName);
  const vehicle = escHtml(data.vehicleName);
  const bId = escHtml(data.bookingId);
  const fmtTimeAt = (t?: string) => {
    const formatted = fmtTime(t);
    return formatted ? ` at ${formatted}` : "";
  };

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
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
        <p style="margin:0;font-size:13px;color:#6b7280;">Total: <strong style="color:#7C3AED;">$${data.totalPrice.toFixed(2)}</strong></p>
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
    await transporter.sendMail({
      from: FROM_CUSTOMER,
      to: data.customerEmail,
      subject: `Return Reminder - ${data.vehicleName} due today`,
      html: returnReminderTemplate(data),
    });
    console.log("Return reminder sent to:", data.customerEmail);
  } catch (error) {
    console.error("Failed to send return reminder:", error);
    throw error;
  }
}

export async function sendPasswordResetLink(data: { customerName: string; customerEmail: string }) {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: FROM_CUSTOMER,
      to: data.customerEmail,
      subject: "Set Your Password - NextGearAuto",
      html: passwordResetTemplate(data),
    });
    console.log("Password reset link sent to:", data.customerEmail);
  } catch (error) {
    console.error("Failed to send password reset link:", error);
    throw error;
  }
}
