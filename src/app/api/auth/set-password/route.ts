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

export async function POST(request: Request) {
  try {
    // Rate limit password set attempts (uses login limiter)
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

    // Validate the cryptographic token if provided (new flow)
    if (token) {
      const tokenEmail = validatePasswordToken(token);
      if (!tokenEmail || tokenEmail !== email.toLowerCase().trim()) {
        return NextResponse.json(
          { success: false, message: "Invalid or expired link. Please request a new one." },
          { status: 400 }
        );
      }
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

    // Find the customer
    const { data: customer, error: findError } = await supabase
      .from("customers")
      .select(`id, password_hash, name, email, phone, dob, created_at, ${CUSTOMER_CAPABILITIES_SELECT}`)
      .eq("email", normalizedEmail)
      .maybeSingle();

    // Timing attack mitigation: always perform a bcrypt hash to ensure
    // consistent response time whether the account exists or not.
    // This prevents attackers from enumerating valid email addresses.
    if (findError || !customer) {
      await bcrypt.hash(password, 12); // constant-time dummy operation
      return NextResponse.json(
        { success: false, message: "Unable to set password. Please check the link in your email and try again." },
        { status: 400 }
      );
    }

    // Only allow setting password if one doesn't exist yet
    if (customer.password_hash) {
      await bcrypt.hash(password, 12); // constant-time dummy operation
      return NextResponse.json(
        { success: false, message: "Unable to set password. Please check the link in your email and try again." },
        { status: 400 }
      );
    }

    // Hash and set the password
    const passwordHash = await bcrypt.hash(password, 12);
    const { error: updateError } = await supabase
      .from("customers")
      .update({ password_hash: passwordHash })
      .eq("id", customer.id);

    if (updateError) {
      logger.error("Set password error:", updateError);
      return NextResponse.json(
        { success: false, message: "Failed to set password. Please try again." },
        { status: 500 }
      );
    }

    // Return user data so frontend can log them in
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
      message: "Password set successfully!",
      data: userData,
    });
    return setAuthCookies(response, accessToken, refreshToken);
  } catch (err) {
    logger.error("Set password API error:", err);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
