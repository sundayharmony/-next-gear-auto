import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { promoLimiter, getClientIp, rateLimitResponse } from "@/lib/security/rate-limit";
import { logger } from "@/lib/utils/logger";

export async function POST(req: NextRequest) {
  try {
    // Rate limit promo validation
    const ip = getClientIp(req);
    const rateCheck = promoLimiter.check(ip);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.resetAt);
    }

    const { code, bookingAmount } = await req.json();

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

    // Database promo code validation
    if (!promo.is_active) {
      return NextResponse.json(
        { success: false, message: "This promo code is no longer active" },
        { status: 400 }
      );
    }

    if (promo.expires_at && new Date(promo.expires_at.includes("T") ? promo.expires_at : promo.expires_at + "T23:59:59") < new Date()) {
      return NextResponse.json(
        { success: false, message: "This promo code has expired" },
        { status: 400 }
      );
    }

    if (promo.max_uses && promo.used_count >= promo.max_uses) {
      return NextResponse.json(
        { success: false, message: "This promo code has reached its usage limit" },
        { status: 400 }
      );
    }

    if (bookingAmount && promo.min_booking_amount && bookingAmount < promo.min_booking_amount) {
      return NextResponse.json(
        { success: false, message: `Minimum booking amount of $${promo.min_booking_amount} required` },
        { status: 400 }
      );
    }

    // Calculate discount
    let discountAmount = 0;
    if (promo.discount_type === "percentage") {
      discountAmount = (bookingAmount && Number.isFinite(bookingAmount)) ? Math.round(bookingAmount * (promo.discount_value / 100) * 100) / 100 : 0;
    } else {
      discountAmount = promo.discount_value;
    }

    // NOTE: Promo code usage is validated at checkout (server-side) where the
    // actual booking is created. We do NOT increment used_count here during
    // validation — only during checkout to avoid inflating the count when users
    // validate a code but never complete their booking. The checkout route
    // re-validates the code and increments atomically.

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
