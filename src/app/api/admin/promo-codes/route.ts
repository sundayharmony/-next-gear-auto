import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";

function discountValidationMessage(type: unknown, value: unknown): string | null {
  if (type !== "percentage" && type !== "fixed") {
    return "Discount type must be percentage or fixed";
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "Discount value must be a non-negative number";
  }
  if (type === "percentage" && value > 100) {
    return "Percentage discount must be between 0 and 100";
  }
  return null;
}

// GET: List all promo codes (Supabase with JSON fallback)
export async function GET(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;
  const supabase = getServiceSupabase();
  try {
    const { data, error } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (!error && data && data.length > 0) {
      const codes = data.map((c) => ({
        code: c.code,
        promoType: c.promo_type ?? "campaign",
        ownerCustomerId: c.owner_customer_id ?? null,
        discountType: c.discount_type,
        discountValue: c.discount_value,
        minBookingAmount: c.min_booking_amount,
        maxUses: c.max_uses,
        usedCount: c.used_count,
        expiresAt: c.expires_at,
        description: c.description,
        isActive: c.is_active,
      }));
      return NextResponse.json({ success: true, data: codes, source: "supabase" });
    }
  } catch (err) {
    logger.error("Promo codes fetch error:", err);
  }

  // Return empty array if no codes found in database
  return NextResponse.json({ success: true, data: [], source: "supabase" });
}

// POST: Create a new promo code
export async function POST(request: NextRequest) {
  const auth = await verifyAdminOrManager(request);
  if (!auth.authorized) return auth.response;
  const supabase = getServiceSupabase();
  try {
    const body = await request.json();

    if (!body.code) {
      return NextResponse.json({ success: false, message: "Code is required" }, { status: 400 });
    }

    // Validate code format: alphanumeric, hyphens, underscores, 1-50 chars
    const codeRegex = /^[a-zA-Z0-9_-]{1,50}$/;
    if (!codeRegex.test(body.code)) {
      return NextResponse.json(
        { success: false, message: "Code must be 1-50 characters and contain only letters, numbers, hyphens, and underscores" },
        { status: 400 }
      );
    }

    const discountType = body.discountType || "percentage";
    const discountValue = body.discountValue !== undefined ? body.discountValue : 10;
    const discountError = discountValidationMessage(discountType, discountValue);
    if (discountError) {
      return NextResponse.json(
        { success: false, message: discountError },
        { status: 400 }
      );
    }

    // Validate expiry date if provided
    if (body.expiresAt) {
      const expiryDate = new Date(body.expiresAt);
      if (isNaN(expiryDate.getTime())) {
        return NextResponse.json(
          { success: false, message: "Invalid expiry date format" },
          { status: 400 }
        );
      }
      if (expiryDate <= new Date()) {
        return NextResponse.json(
          { success: false, message: "Expiry date must be in the future" },
          { status: 400 }
        );
      }
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from("promo_codes")
      .select("code")
      .eq("code", body.code.toUpperCase())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: false, message: "Promo code already exists" }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("promo_codes")
      .insert({
        code: body.code.toUpperCase(),
        discount_type: discountType,
        discount_value: discountValue,
        min_booking_amount: body.minBookingAmount ?? 0,
        max_uses: body.maxUses || 100,
        used_count: 0,
        expires_at: body.expiresAt || null,
        description: body.description || "",
        is_active: true,
      })
      .select()
      .maybeSingle();

    if (error) {
      logger.error("Promo code create error:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    logger.error("Promo code create error:", err);
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
}

// PUT: Update a promo code
export async function PUT(request: NextRequest) {
  const auth = await verifyAdminOrManager(request);
  if (!auth.authorized) return auth.response;
  const supabase = getServiceSupabase();
  try {
    const body = await request.json();

    if (!body.code) {
      return NextResponse.json({ success: false, message: "Code is required" }, { status: 400 });
    }

    const { data: existingPromo, error: existingPromoError } = await supabase
      .from("promo_codes")
      .select("discount_type, discount_value, promo_type")
      .eq("code", body.code.toUpperCase())
      .maybeSingle();
    if (existingPromoError) {
      logger.error("Promo code lookup error:", existingPromoError);
      return NextResponse.json(
        { success: false, message: "Unable to validate promo code" },
        { status: 500 },
      );
    }
    if (!existingPromo) {
      return NextResponse.json(
        { success: false, message: "Promo code not found" },
        { status: 404 },
      );
    }

    if (existingPromo.promo_type === "referral") {
      return NextResponse.json(
        { success: false, message: "Referral codes are system-managed and cannot be edited" },
        { status: 403 },
      );
    }

    const effectiveDiscountType =
      body.discountType ?? existingPromo.discount_type;
    const effectiveDiscountValue =
      body.discountValue ?? existingPromo.discount_value;
    if (body.discountType !== undefined || body.discountValue !== undefined) {
      const discountError = discountValidationMessage(
        effectiveDiscountType,
        effectiveDiscountValue,
      );
      if (discountError) {
        return NextResponse.json(
          { success: false, message: discountError },
          { status: 400 },
        );
      }
    }

    // Validate expiry date if being updated
    if (body.expiresAt !== undefined && body.expiresAt !== null) {
      const expiryDate = new Date(body.expiresAt);
      if (isNaN(expiryDate.getTime())) {
        return NextResponse.json(
          { success: false, message: "Invalid expiry date format" },
          { status: 400 }
        );
      }
      if (expiryDate <= new Date()) {
        return NextResponse.json(
          { success: false, message: "Expiry date must be in the future" },
          { status: 400 }
        );
      }
    }

    const dbUpdates: Record<string, unknown> = {};
    if (body.discountType !== undefined) dbUpdates.discount_type = body.discountType;
    if (body.discountValue !== undefined) dbUpdates.discount_value = body.discountValue;
    if (body.minBookingAmount !== undefined) dbUpdates.min_booking_amount = body.minBookingAmount;
    if (body.maxUses !== undefined) dbUpdates.max_uses = body.maxUses;
    if (body.expiresAt !== undefined) dbUpdates.expires_at = body.expiresAt || null;
    if (body.description !== undefined) dbUpdates.description = body.description;
    if (body.isActive !== undefined) dbUpdates.is_active = body.isActive;

    const { error } = await supabase
      .from("promo_codes")
      .update(dbUpdates)
      .eq("code", body.code.toUpperCase());

    if (error) {
      logger.error("Promo code update error:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Promo code updated" });
  } catch (err) {
    logger.error("Promo code update error (outer):", err);
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
}

// DELETE: Remove a promo code
export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminOrManager(request);
  if (!auth.authorized) return auth.response;
  const supabase = getServiceSupabase();
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ success: false, message: "Code required" }, { status: 400 });
    }

    const { data: existingPromo, error: existingPromoError } = await supabase
      .from("promo_codes")
      .select("promo_type")
      .eq("code", code.toUpperCase())
      .maybeSingle();

    if (existingPromoError) {
      logger.error("Promo code lookup error:", existingPromoError);
      return NextResponse.json(
        { success: false, message: "Unable to validate promo code" },
        { status: 500 },
      );
    }

    if (existingPromo?.promo_type === "referral") {
      return NextResponse.json(
        { success: false, message: "Referral codes are system-managed and cannot be deleted" },
        { status: 403 },
      );
    }

    const { error } = await supabase
      .from("promo_codes")
      .delete()
      .eq("code", code.toUpperCase());

    if (error) {
      logger.error("Promo code delete error:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Code deleted" });
  } catch (err) {
    logger.error("Promo code delete error (outer):", err);
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
}
