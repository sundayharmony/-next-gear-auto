import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";

// GET: List all promo codes (Supabase with JSON fallback)
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;
  const supabase = getServiceSupabase();
  try {
    const { data, error } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && data && data.length > 0) {
      const codes = data.map((c) => ({
        code: c.code,
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
  const auth = await verifyAdmin(request);
  if (!auth.authorized) return auth.response;
  const supabase = getServiceSupabase();
  try {
    const body = await request.json();

    if (!body.code) {
      return NextResponse.json({ success: false, message: "Code is required" }, { status: 400 });
    }

    // Validate discount value is between 0-100
    const discountValue = body.discountValue !== undefined ? body.discountValue : 10;
    if (typeof discountValue !== "number" || discountValue < 0 || discountValue > 100) {
      return NextResponse.json(
        { success: false, message: "Discount value must be a number between 0 and 100" },
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
      .single();

    if (existing) {
      return NextResponse.json({ success: false, message: "Promo code already exists" }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("promo_codes")
      .insert({
        code: body.code.toUpperCase(),
        discount_type: body.discountType || "percentage",
        discount_value: discountValue,
        min_booking_amount: body.minBookingAmount ?? 0,
        max_uses: body.maxUses || 100,
        used_count: 0,
        expires_at: body.expiresAt || null,
        description: body.description || "",
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      logger.error("Promo code create error:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
}

// PUT: Update a promo code
export async function PUT(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) return auth.response;
  const supabase = getServiceSupabase();
  try {
    const body = await request.json();

    if (!body.code) {
      return NextResponse.json({ success: false, message: "Code is required" }, { status: 400 });
    }

    // Validate discount value if being updated
    if (body.discountValue !== undefined) {
      if (typeof body.discountValue !== "number" || body.discountValue < 0 || body.discountValue > 100) {
        return NextResponse.json(
          { success: false, message: "Discount value must be a number between 0 and 100" },
          { status: 400 }
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
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
}

// DELETE: Remove a promo code
export async function DELETE(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) return auth.response;
  const supabase = getServiceSupabase();
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ success: false, message: "Code required" }, { status: 400 });
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
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
}
