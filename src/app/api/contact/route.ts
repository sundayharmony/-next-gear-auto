import { NextResponse } from "next/server";
import { getTransporter } from "@/lib/email/mailer";
import { contactLimiter, getClientIp, rateLimitResponse } from "@/lib/security/rate-limit";
import { logger } from "@/lib/utils/logger";

export async function POST(request: Request) {
  try {
    // Rate limit contact form submissions
    const ip = getClientIp(request);
    const rateCheck = contactLimiter.check(ip);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.resetAt);
    }

    const body = await request.json();
    const { name, email, phone, message } = body;

    // Validation
    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, message: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    if (name.length > 100 || email.length > 200 || message.length > 5000) {
      return NextResponse.json(
        { success: false, message: "Input exceeds maximum length." },
        { status: 400 }
      );
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Invalid email address." },
        { status: 400 }
      );
    }

    // Sanitize inputs for email: escape HTML entities and strip CRLF for SMTP header injection prevention
    const escapeHtml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    const clean = (s: string) => escapeHtml(s.replace(/[\r\n]/g, " ").trim());
    const safeName = clean(name);
    const safeEmail = clean(email);
    const safePhone = clean(phone || "Not provided");
    const safeMessage = clean(message);

    const transporter = getTransporter();

    // Send to admin
    await transporter.sendMail({
      from: `"NextGearAuto Website" <${process.env.SMTP_USER || "contact@rentnextgearauto.com"}>`,
      to: process.env.ADMIN_EMAIL || "contact@rentnextgearauto.com",
      replyTo: safeEmail,
      subject: `Website Inquiry from ${safeName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #7C3AED, #5B21B6); padding: 24px; border-radius: 12px 12px 0 0;">
            <h2 style="color: #fff; margin: 0;">New Contact Form Submission</h2>
          </div>
          <div style="padding: 24px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Name</td><td style="padding: 8px 0; font-weight: 600;">${safeName}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email</td><td style="padding: 8px 0;"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Phone</td><td style="padding: 8px 0;">${safePhone}</td></tr>
            </table>
            <div style="margin-top: 16px; padding: 16px; background: #f3f0ff; border-radius: 8px;">
              <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase;">Message</p>
              <p style="margin: 0; color: #1f2937; white-space: pre-wrap;">${safeMessage}</p>
            </div>
            <p style="margin-top: 16px; color: #9ca3af; font-size: 12px;">
              You can reply directly to this email to respond to ${safeName}.
            </p>
          </div>
        </div>
      `,
    });

    // Send auto-reply to customer
    await transporter.sendMail({
      from: `"NextGearAuto" <${process.env.SMTP_USER || "contact@rentnextgearauto.com"}>`,
      to: safeEmail,
      subject: "We received your message — NextGearAuto",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #7C3AED, #5B21B6); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h2 style="color: #fff; margin: 0;">Thank You, ${safeName}!</h2>
            <p style="color: #DDD6FE; margin: 8px 0 0; font-size: 14px;">We've received your message</p>
          </div>
          <div style="padding: 24px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #374151;">We'll get back to you within 24 hours. If you need immediate assistance, please call us at <strong>(551) 429-3472</strong>.</p>
            <p style="color: #6b7280; font-size: 14px;">Business Hours: Mon-Fri 8AM-6PM</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">NextGearAuto | 92 Forrest Street, Jersey City, NJ 07304</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: "Message sent successfully." });
  } catch (error) {
    logger.error("Contact form error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }
}
