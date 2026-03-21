import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import bcrypt from "bcryptjs";
import { validatePassword, PASSWORD_REQUIREMENTS } from "@/lib/auth/password-policy";
import { loginLimiter, getClientIp, rateLimitResponse } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    // Rate limit password set attempts (uses login limiter)
    const ip = getClientIp(request);
    const rateCheck = loginLimiter.check(ip);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.resetAt);
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
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

    // Find the customer
    const { data: customer, error: findError } = await supabase
      .from("customers")
      .select("id, password_hash, name, email, phone, dob, role, created_at")
      .eq("email", normalizedEmail)
      .single();

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
      console.error("Set password error:", updateError);
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

    return NextResponse.json({
      success: true,
      message: "Password set successfully!",
      data: userData,
    });
  } catch (err) {
    console.error("Set password API error:", err);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
