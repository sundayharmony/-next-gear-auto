import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { sendCustomerPasswordEmail } from "@/lib/auth/send-customer-password-email";
import { passwordEmailLimiter, getClientIp, rateLimitResponse } from "@/lib/security/rate-limit";
import { isValidEmailFormat } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";

const GENERIC_SUCCESS_MESSAGE =
  "If an account exists for that email, password reset instructions have been sent.";

/**
 * POST /api/auth/forgot-password
 * Public self-service password reset for customer/manager/owner accounts.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateCheck = await passwordEmailLimiter.check(ip);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetAt);
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!email || !isValidEmailFormat(email)) {
    return NextResponse.json(
      { success: false, message: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  try {
    const supabase = getServiceSupabase();
    const { data: customer, error } = await supabase
      .from("customers")
      .select("id, name, email, password_hash")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      logger.error("Forgot-password lookup error:", error);
      return NextResponse.json({ success: true, message: GENERIC_SUCCESS_MESSAGE });
    }

    if (customer?.email) {
      try {
        await sendCustomerPasswordEmail(customer);
      } catch (emailError) {
        logger.error("Forgot-password email send failed:", emailError);
      }
    }

    return NextResponse.json({ success: true, message: GENERIC_SUCCESS_MESSAGE });
  } catch (err) {
    logger.error("Forgot-password error:", err);
    return NextResponse.json({ success: true, message: GENERIC_SUCCESS_MESSAGE });
  }
}
