import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { sendCustomerPasswordEmail } from "@/lib/auth/send-customer-password-email";
import { hasManagerPortalAccess } from "@/lib/auth/customer-capabilities";
import { isValidEmailFormat } from "@/lib/utils/validation";
import { passwordEmailLimiter, getClientIp, rateLimitResponse } from "@/lib/security/rate-limit";
import { auditLog } from "@/lib/security/audit-log";
import { logger } from "@/lib/utils/logger";

type Params = { params: Promise<{ managerId: string }> };

/**
 * POST /api/admin/managers/[managerId]/send-password-email
 * Admin-only: send set-password or reset-password email to a manager account.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const ip = getClientIp(req);
  const rateCheck = await passwordEmailLimiter.check(ip);
  if (!rateCheck.allowed) {
    auditLog("RATE_LIMITED", { ip, userId: auth.adminId, details: { action: "manager_send_password_email" } });
    return rateLimitResponse(rateCheck.resetAt);
  }

  const { managerId } = await params;
  if (!managerId?.trim()) {
    return NextResponse.json({ success: false, message: "Invalid manager id" }, { status: 400 });
  }

  try {
    const supabase = getServiceSupabase();
    const { data: manager, error } = await supabase
      .from("customers")
      .select("id, name, email, password_hash, role, manager_access_enabled, owner_portal_enabled")
      .eq("id", managerId)
      .maybeSingle();

    if (error) {
      logger.error("Manager send-password-email load error:", error);
      return NextResponse.json({ success: false, message: "Failed to load manager" }, { status: 500 });
    }

    if (!manager || !hasManagerPortalAccess(manager)) {
      return NextResponse.json({ success: false, message: "Manager not found" }, { status: 404 });
    }

    const email = (manager.email || "").trim().toLowerCase();
    if (!email || !isValidEmailFormat(email)) {
      return NextResponse.json({ success: false, message: "Manager has no valid email on file" }, { status: 400 });
    }

    const { emailType } = await sendCustomerPasswordEmail(manager);

    auditLog("ADMIN_ACTION", {
      ip,
      userId: auth.adminId,
      email,
      details: {
        action: "manager_send_password_email",
        targetUserId: manager.id,
        emailType,
      },
    });

    return NextResponse.json({
      success: true,
      emailType,
      message:
        emailType === "reset"
          ? `Reset password link sent to ${email}`
          : `Set password link sent to ${email}`,
    });
  } catch (err) {
    logger.error("Manager send-password-email error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to send password email" },
      { status: 500 }
    );
  }
}
