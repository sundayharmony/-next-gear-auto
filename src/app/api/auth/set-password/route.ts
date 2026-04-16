import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import bcrypt from "bcryptjs";
import { validatePassword, PASSWORD_REQUIREMENTS } from "@/lib/auth/password-policy";
import { loginLimiter, getClientIp, rateLimitResponse } from "@/lib/security/rate-limit";
import { logger } from "@/lib/utils/logger";
import { validatePasswordToken } from "@/lib/auth/password-token";
import { createAccessToken, createRefreshToken, setAuthCookies } from "@/lib/auth/jwt";
import { isAppRole } from "@/lib/auth/roles";

export async function POST(request: Request) {
  try {
    // Rate limit password set attempts (uses login limiter)
    const ip = getClientIp(request);
    const rateCheck = loginLimiter.check(ip);
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
      .select("id, password_hash, name, email, phone, dob, role, created_at")
      .eq("email", normalizedEmail)
      .maybeSingle();
    // #region agent log
    fetch('http://127.0.0.1:7281/ingest/53c91875-0450-4365-9e2e-62372b8ba563',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6fde49'},body:JSON.stringify({sessionId:'6fde49',runId:'admin-access-denied-run1',hypothesisId:'H5',location:'api/auth/set-password/route.ts:customerLookup',message:'Set-password customer lookup result',data:{lookupError:Boolean(findError),hasCustomer:Boolean(customer),dbRole:customer?.role||null,hasExistingPassword:Boolean(customer?.password_hash)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

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
      role: customer.role || "customer",
    };

    // Issue JWT tokens so user is logged in automatically
    const customerRole = isAppRole(customer.role) ? customer.role : "customer";
    // #region agent log
    fetch('http://127.0.0.1:7281/ingest/53c91875-0450-4365-9e2e-62372b8ba563',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6fde49'},body:JSON.stringify({sessionId:'6fde49',runId:'admin-access-denied-run1',hypothesisId:'H5',location:'api/auth/set-password/route.ts:tokenIssue',message:'Set-password token role selection',data:{dbRole:customer.role||null,issuedRole:customerRole},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const accessToken = await createAccessToken({ userId: customer.id, role: customerRole, email: customer.email });
    const refreshToken = await createRefreshToken({ userId: customer.id, role: customerRole, email: customer.email });

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
