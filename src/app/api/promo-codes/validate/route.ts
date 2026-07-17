import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { promoLimiter, getClientIp, rateLimitResponse } from "@/lib/security/rate-limit";
import { logger } from "@/lib/utils/logger";
import { getAuthFromRequest } from "@/lib/auth/jwt";
import {
  validatePromoEligibility,
  type PromoCodeRow,
} from "@/lib/promo-codes/promo-integrity";

export async function POST(req: NextRequest) {
  try {
    // Rate limit promo validation
    const ip = getClientIp(req);
    const rateCheck = await promoLimiter.check(ip);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.resetAt);
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
    }

    const { code, bookingAmount } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, message: "Promo code is required" },
        { status: 400 }
      );
    }

    // Limit promo code length and validate format (Bug 25, Bug 19)
    const safeCode = (code || "").trim().slice(0, 50);

    // Add alphanumeric validation to prevent injection
    if (!/^[a-zA-Z0-9_-]{1,50}$/.test(safeCode)) {
      return NextResponse.json({ success: false, message: "Invalid promo code format" }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    let authCustomerId: string | null = null;
    try {
      const auth = await getAuthFromRequest(req);
      authCustomerId = auth?.sub ?? null;
    } catch {
      authCustomerId = null;
    }

    // Look up promo code from database first, fall back to JSON file
    const { data: promo, error } = await supabase
      .from("promo_codes")
      .select("*")
      .ilike("code", safeCode)
      .maybeSingle();

    if (error || !promo) {
      return NextResponse.json(
        { success: false, message: "Invalid promo code" },
        { status: 404 }
      );
    }

    const safeBookingAmount =
      typeof bookingAmount === "number" && Number.isFinite(bookingAmount)
        ? bookingAmount
        : 0;
    const eligibility = validatePromoEligibility(
      promo as PromoCodeRow,
      safeBookingAmount,
      new Date(),
      { customerId: authCustomerId },
    );
    if (!eligibility.ok) {
      return NextResponse.json(
        { success: false, message: eligibility.message },
        { status: 400 }
      );
    }

    // Calculate discount
    let discountAmount = 0;
    if (promo.discount_type === "percentage") {
      discountAmount = Math.round(safeBookingAmount * (promo.discount_value / 100) * 100) / 100;
    } else {
      discountAmount = Math.min(promo.discount_value, safeBookingAmount);
    }

    // Validation never consumes a redemption. Confirmed bookings are counted
    // atomically by redeem_booking_promo after free checkout or Stripe payment.

    return NextResponse.json({
      success: true,
      data: {
        code: promo.code,
        discountType: promo.discount_type,
        discountValue: promo.discount_value,
        discountAmount,
        description: promo.description,
      },
    });
  } catch (err) {
    logger.error("Promo validation error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to validate promo code" },
      { status: 500 }
    );
  }
}
