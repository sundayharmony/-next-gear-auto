import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";

/**
 * GET /api/bookings/check-overlap?vehicleId=...&pickupDate=...&returnDate=...
 *
 * Checks whether a vehicle has any overlapping bookings for the given date range.
 * Used by the admin CreateBookingForm to warn before double-booking.
 */
export async function GET(req: NextRequest) {
  try {
    // Admin-only endpoint
    const auth = await verifyAdmin(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get("vehicleId");
    const pickupDate = searchParams.get("pickupDate");
    const returnDate = searchParams.get("returnDate");

    if (!vehicleId || !pickupDate || !returnDate) {
      return NextResponse.json(
        { success: false, hasOverlap: false, message: "Missing required params" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    const { data: conflicting } = await supabase
      .from("bookings")
      .select("id, pickup_date, return_date, pickup_time, return_time, customer_name, status")
      .eq("vehicle_id", vehicleId)
      .in("status", ["confirmed", "active", "pending"])
      .lte("pickup_date", returnDate)
      .gte("return_date", pickupDate);

    // Apply time-based gap logic: allow same-day turnovers with 60+ minute gap
    let hasRealOverlap = false;
    if (conflicting && conflicting.length > 0) {
      const newPickup = new Date(`${pickupDate}T00:00:00`);
      const newReturn = new Date(`${returnDate}T23:59:00`);

      hasRealOverlap = conflicting.some((existing) => {
        const existPickup = new Date(`${existing.pickup_date}T${existing.pickup_time || "00:00"}`);
        const existReturn = new Date(`${existing.return_date}T${existing.return_time || "23:59"}`);

        // Check if there is at least 60 minutes gap between the two bookings
        const gapAfterExisting = (newPickup.getTime() - existReturn.getTime()) / 60000;
        const gapAfterNew = (existPickup.getTime() - newReturn.getTime()) / 60000;

        // No conflict if new booking starts 60+ min after existing ends,
        // or existing starts 60+ min after new booking ends
        return gapAfterExisting < 60 && gapAfterNew < 60;
      });
    }

    return NextResponse.json({
      success: true,
      hasOverlap: hasRealOverlap,
      conflicting: conflicting || [],
    });
  } catch (error) {
    logger.error("Check overlap error:", error);
    return NextResponse.json(
      { success: false, hasOverlap: false, message: "Failed to check overlap" },
      { status: 500 }
    );
  }
}
