import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import bcrypt from "bcryptjs";
import { validatePassword, PASSWORD_REQUIREMENTS } from "@/lib/auth/password-policy";
import { loginLimiter, getClientIp, rateLimitResponse } from "@/lib/security/rate-limit";
import { logger } from "@/lib/utils/logger";
import { validatePasswordToken } from "@/lib/auth/password-token";
import { setAuthCookies } from "@/lib/auth/jwt";
import { CUSTOMER_CAPABILITIES_SELECT, resolveCustomerRoles } from "@/lib/auth/customer-capabilities";
import { issueCustomerTokens } from "@/lib/auth/issue-customer-tokens";
import { auditLog } from "@/lib/security/audit-log";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateCheck = await loginLimiter.check(ip);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.resetAt);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 });
    }
    const { email, password, token } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Invalid or missing reset token. Please use the link from your email." },
        { status: 400 }
      );
    }

    const tokenEmail = validatePasswordToken(token);
    if (!tokenEmail || tokenEmail !== email.toLowerCase().trim()) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired link. Please request a new one." },
        { status: 400 }
      );
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return NextResponse.json(
        { success: false, message: pwCheck.message, requirements: PASSWORD_REQUIREMENTS },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const supabase = getServiceSupabase();

    const { data: customer, error: findError } = await supabase
      .from("customers")
      .select(`id, password_hash, name, email, phone, dob, created_at, ${CUSTOMER_CAPABILITIES_SELECT}`)
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (findError || !customer) {
      await bcrypt.hash(password, 12);
      return NextResponse.json(
        { success: false, message: "Unable to reset password. Please check the link in your email and try again." },
        { status: 400 }
      );
    }

    if (!customer.password_hash) {
      await bcrypt.hash(password, 12);
      return NextResponse.json(
        { success: false, message: "No password is set for this account. Use the set-password link from your email instead." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { error: updateError } = await supabase
      .from("customers")
      .update({ password_hash: passwordHash })
      .eq("id", customer.id);

    if (updateError) {
      logger.error("Reset password error:", updateError);
      return NextResponse.json(
        { success: false, message: "Failed to reset password. Please try again." },
        { status: 500 }
      );
    }

    auditLog("PASSWORD_CHANGE", {
      ip,
      userId: customer.id,
      email: normalizedEmail,
      details: { method: "reset_link", role: customer.role },
    });

    const roles = resolveCustomerRoles(customer);
    const userData = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone || "",
      dob: customer.dob || "",
      driverLicense: null,
      paymentMethods: [],
      bookings: [],
      createdAt: customer.created_at,
      role: roles.includes("manager") ? "manager" : roles.includes("owner") ? "owner" : customer.role || "customer",
      roles,
    };

    const { accessToken, refreshToken } = await issueCustomerTokens(customer);

    const response = NextResponse.json({
      success: true,
      message: "Password reset successfully!",
      data: userData,
    });
    return setAuthCookies(response, accessToken, refreshToken);
  } catch (err) {
    logger.error("Reset password API error:", err);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
