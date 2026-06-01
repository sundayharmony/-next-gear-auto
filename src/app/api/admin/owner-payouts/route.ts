import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { computePayoutBreakdown, clampPercentage, DEFAULT_OWNER_PERCENTAGE } from "@/lib/owner/finance";
import { notifyOwner } from "@/lib/owner/notifications";
import { getVehicleDisplayName } from "@/lib/types";
import { loadOwnerDataset } from "@/lib/owner/owner-data";
import { logger } from "@/lib/utils/logger";

const VALID_STATUS = ["pending", "issued", "paid"] as const;

/**
 * GET /api/admin/owner-payouts?ownerId=...
 * Returns the owner's bookings enriched with their current payout status so an
 * admin can review and issue payouts.
 */
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const ownerId = new URL(req.url).searchParams.get("ownerId");
    if (!ownerId) {
      return NextResponse.json({ success: false, message: "ownerId is required" }, { status: 400 });
    }
    const { bookings } = await loadOwnerDataset(ownerId);
    return NextResponse.json(
      { success: true, data: bookings },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    logger.error("Admin owner-payouts GET error:", err);
    return NextResponse.json({ success: false, message: "Failed to load payouts" }, { status: 500 });
  }
}

/**
 * POST /api/admin/owner-payouts
 * Create or update a payout record for a booking.
 * Body: { bookingId, status, otherExpenses?, payoutDate?, notes? }
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const body = await req.json();
    const { bookingId } = body;
    const status = body.status;

    if (!bookingId) {
      return NextResponse.json({ success: false, message: "bookingId is required" }, { status: 400 });
    }
    if (String(bookingId).startsWith("turo:")) {
      return NextResponse.json(
        {
          success: false,
          message: "Turo trips cannot have owner payout records. Use website bookings only.",
        },
        { status: 400 }
      );
    }
    if (status && !VALID_STATUS.includes(status)) {
      return NextResponse.json({ success: false, message: "Invalid status" }, { status: 400 });
    }

    const { data: booking } = await supabase
      .from("bookings")
      .select("id, vehicle_id, total_price, payment_method, status, customer_name, pickup_date, return_date")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) {
      return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
    }

    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("id, year, make, model, owner_id, owner_percentage, is_company_owned")
      .eq("id", booking.vehicle_id)
      .maybeSingle();
    if (!vehicle || vehicle.is_company_owned) {
      return NextResponse.json(
        { success: false, message: "This booking's vehicle is company-owned (no owner payout)" },
        { status: 400 }
      );
    }
    if (!vehicle.owner_id) {
      return NextResponse.json({ success: false, message: "This booking's vehicle has no owner assigned" }, { status: 400 });
    }

    const ownerPercentage = clampPercentage(vehicle.owner_percentage ?? DEFAULT_OWNER_PERCENTAGE);
    const otherExpenses = Number(body.otherExpenses) || 0;
    const gross = booking.status === "cancelled" ? 0 : Number(booking.total_price) || 0;
    const breakdown = computePayoutBreakdown({
      grossRevenue: gross,
      ownerPercentage,
      otherExpenses,
      paymentMethod: booking.payment_method || null,
    });

    const finalStatus = status || "pending";
    const payoutDate =
      finalStatus === "pending"
        ? null
        : body.payoutDate || new Date().toISOString().slice(0, 10);

    const record = {
      owner_id: vehicle.owner_id,
      vehicle_id: vehicle.id,
      booking_id: bookingId,
      gross_revenue: breakdown.grossRevenue,
      platform_fees: breakdown.platformFees,
      processing_fees: breakdown.processingFees,
      other_expenses: breakdown.otherExpenses,
      net_revenue: breakdown.netRevenue,
      owner_percentage: breakdown.ownerPercentage,
      owner_payout: breakdown.ownerPayout,
      status: finalStatus,
      payout_date: payoutDate,
      notes: body.notes ? String(body.notes).slice(0, 500) : null,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("owner_payouts")
      .select("id, status")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from("owner_payouts").update(record).eq("id", existing.id);
      if (error) {
        logger.error("Update payout error:", error);
        return NextResponse.json({ success: false, message: "Failed to update payout" }, { status: 500 });
      }
    } else {
      const { error } = await supabase.from("owner_payouts").insert(record);
      if (error) {
        logger.error("Insert payout error:", error);
        return NextResponse.json({ success: false, message: "Failed to create payout" }, { status: 500 });
      }
    }

    // Notify the owner when a payout is issued/paid (not on plain 'pending' edits).
    if (finalStatus !== "pending" && existing?.status !== finalStatus) {
      await notifyOwner({
        ownerId: vehicle.owner_id,
        type: "payout_issued",
        title: finalStatus === "paid" ? "Payout paid" : "Payout issued",
        message: `${getVehicleDisplayName(vehicle)} — $${breakdown.ownerPayout.toFixed(2)} for booking ${bookingId}.`,
        bookingId,
        vehicleId: vehicle.id,
      });
    }

    return NextResponse.json({ success: true, data: breakdown });
  } catch (err) {
    logger.error("Admin owner-payouts POST error:", err);
    const msg = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
