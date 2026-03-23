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
        { success: false, error: "Promo code is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Look up promo code from database first, fall back to JSON file
    const { data: promo, error } = await supabase
      .from("promo_codes")
      .select("*")
      .ilike("code", code.trim())
      .single();

    if (error || !promo) {
      // Fall back to JSON file for legacy codes
      interface LegacyPromo {
        code: string;
        discountType: string;
        discountValue: number;
        minBookingAmount: number;
        maxUses: number;
        usedCount: number;
        expiryDate: string;
        description: string;
      }
      let promoCodes: LegacyPromo[] = [];
      try {
        const jsonModule = await import("@/data/promo-codes.json");
        promoCodes = jsonModule.default || [];
      } catch {
        // No JSON file available
      }

      const jsonPromo = promoCodes.find(
        (p) => p.code.toUpperCase() === code.toUpperCase()
      );

      if (!jsonPromo) {
        return NextResponse.json(
          { success: false, error: "Invalid promo code" },
          { status: 404 }
        );
      }

      // Validate JSON promo code
      if (new Date(jsonPromo.expiryDate) < new Date()) {
        return NextResponse.json(
          { success: false, error: "This promo code has expired" },
          { status: 400 }
        );
      }
      if (jsonPromo.usedCount >= jsonPromo.maxUses) {
        return NextResponse.json(
          { success: false, error: "This promo code has reached its usage limit" },
          { status: 400 }
        );
      }
      if (bookingAmount && bookingAmount < jsonPromo.minBookingAmount) {
        return NextResponse.json(
          { success: false, error: `Minimum booking amount of $${jsonPromo.minBookingAmount} required` },
          { status: 400 }
        );
      }

      let discountAmount = 0;
      if (jsonPromo.discountType === "percentage") {
        discountAmount = bookingAmount ? Math.round(bookingAmount * (jsonPromo.discountValue / 100) * 100) / 100 : 0;
      } else {
        discountAmount = jsonPromo.discountValue;
      }

      return NextResponse.json({
        success: true,
        data: {
          code: jsonPromo.code,
          discountType: jsonPromo.discountType,
          discountValue: jsonPromo.discountValue,
          discountAmount,
          description: jsonPromo.description,
        },
      });
    }

    // Database promo code validation
    if (!promo.is_active) {
      return NextResponse.json(
        { success: false, error: "This promo code is no longer active" },
        { status: 400 }
      );
    }

    if (promo.expiry_date && new Date(promo.expiry_date) < new Date()) {
      return NextResponse.json(
        { success: false, error: "This promo code has expired" },
        { status: 400 }
      );
    }

    if (promo.max_uses && promo.used_count >= promo.max_uses) {
      return NextResponse.json(
        { success: false, error: "This promo code has reached its usage limit" },
        { status: 400 }
      );
    }

    if (bookingAmount && promo.min_booking_amount && bookingAmount < promo.min_booking_amount) {
      return NextResponse.json(
        { success: false, error: `Minimum booking amount of $${promo.min_booking_amount} required` },
        { status: 400 }
      );
    }

    // Calculate discount
    let discountAmount = 0;
    if (promo.discount_type === "percentage") {
      discountAmount = bookingAmount ? Math.round(bookingAmount * (promo.discount_value / 100) * 100) / 100 : 0;
    } else {
      discountAmount = promo.discount_value;
    }

    // Atomic increment — prevents race condition where two concurrent requests
    // could both read the same used_count and both succeed past the max_uses check.
    // Uses a conditional update: only increment if used_count < max_uses.
    const { error: incrementError, count: updatedCount } = await supabase
      .from("promo_codes")
      .update({ used_count: (promo.used_count ?? 0) + 1 })
      .eq("id", promo.id)
      .lt("used_count", promo.max_uses || 999999);

    if (incrementError || updatedCount === 0) {
      return NextResponse.json(
        { success: false, error: "This promo code has reached its usage limit" },
        { status: 400 }
      );
    }

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
      { success: false, error: "Failed to validate promo code" },
      { status: 500 }
    );
  }
}
