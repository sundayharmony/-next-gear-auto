import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { sendPasswordResetLink, sendAccountPasswordResetEmail } from "@/lib/email/mailer";
import { isValidEmailFormat } from "@/lib/utils/validation";
import { passwordEmailLimiter, getClientIp, rateLimitResponse } from "@/lib/security/rate-limit";
import { auditLog } from "@/lib/security/audit-log";
import { logger } from "@/lib/utils/logger";
import { hasOwnerPortalAccess } from "@/lib/auth/customer-capabilities";

type Params = { params: Promise<{ ownerId: string }> };

/**
 * POST /api/admin/owners/[ownerId]/send-password-email
 * Admin-only: send set-password or reset-password email based on whether owner has a password.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const ip = getClientIp(req);
  const rateCheck = await passwordEmailLimiter.check(ip);
  if (!rateCheck.allowed) {
    auditLog("RATE_LIMITED", { ip, userId: auth.adminId, details: { action: "owner_send_password_email" } });
    return rateLimitResponse(rateCheck.resetAt);
  }

  const { ownerId } = await params;
  if (!ownerId?.trim()) {
    return NextResponse.json({ success: false, message: "Invalid owner id" }, { status: 400 });
  }

  try {
    const supabase = getServiceSupabase();
    const { data: owner, error } = await supabase
      .from("customers")
      .select("id, name, email, password_hash, role, owner_portal_enabled")
      .eq("id", ownerId)
      .maybeSingle();

    if (error) {
      logger.error("Owner send-password-email load error:", error);
      return NextResponse.json({ success: false, message: "Failed to load owner" }, { status: 500 });
    }

    if (!owner || !hasOwnerPortalAccess(owner)) {
      return NextResponse.json({ success: false, message: "Owner not found" }, { status: 404 });
    }

    const email = (owner.email || "").trim().toLowerCase();
    if (!email || !isValidEmailFormat(email)) {
      return NextResponse.json({ success: false, message: "Owner has no valid email on file" }, { status: 400 });
    }

    const hasPassword = Boolean(owner.password_hash);
    const emailPayload = { customerName: owner.name, customerEmail: email };

    if (hasPassword) {
      await sendAccountPasswordResetEmail(emailPayload);
    } else {
      await sendPasswordResetLink(emailPayload);
    }

    auditLog("ADMIN_ACTION", {
      ip,
      userId: auth.adminId,
      email,
      details: {
        action: "owner_send_password_email",
        targetUserId: owner.id,
        emailType: hasPassword ? "reset" : "set",
      },
    });

    return NextResponse.json({
      success: true,
      emailType: hasPassword ? "reset" : "set",
      message: hasPassword
        ? `Reset password link sent to ${email}`
        : `Set password link sent to ${email}`,
    });
  } catch (err) {
    logger.error("Owner send-password-email error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to send password email" },
      { status: 500 }
    );
  }
}
