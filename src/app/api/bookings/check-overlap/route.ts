import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";
import {
  bookingConflictsWithAny,
  overlapConfigForMode,
  toBookingInterval,
  type BookingOverlapMode,
} from "@/lib/utils/booking-overlap";

/**
 * GET /api/bookings/check-overlap?vehicleId=...&pickupDate=...&returnDate=...&pickupTime=&returnTime=
 *
 * Checks whether a vehicle has any overlapping bookings for the given date range.
 * Used by admin/manager CreateBookingForm to warn before double-booking.
 */
export async function GET(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get("vehicleId");
    const pickupDate = searchParams.get("pickupDate");
    const returnDate = searchParams.get("returnDate");
    const pickupTime = searchParams.get("pickupTime") || "00:00";
    const returnTime = searchParams.get("returnTime") || "23:59";

    if (!vehicleId || !pickupDate || !returnDate) {
      return NextResponse.json(
        { success: false, hasOverlap: false, message: "Missing required params" },
        { status: 400 }
      );
    }

    const mode: BookingOverlapMode = auth.role === "manager" ? "manager" : "default";
    const { statuses, minGapMinutes } = overlapConfigForMode(mode);

    const supabase = getServiceSupabase();

    const { data: conflicting } = await supabase
      .from("bookings")
      .select("id, pickup_date, return_date, pickup_time, return_time, customer_name, status")
      .eq("vehicle_id", vehicleId)
      .in("status", [...statuses])
      .lte("pickup_date", returnDate)
      .gte("return_date", pickupDate);

    const proposed = toBookingInterval(pickupDate, returnDate, pickupTime, returnTime);

    let hasRealOverlap = false;
    if (conflicting && conflicting.length > 0) {
      hasRealOverlap = bookingConflictsWithAny(proposed, conflicting, minGapMinutes);
    }

    let blockedConflict = false;
    if (!hasRealOverlap) {
      const { data: blocks } = await supabase
        .from("blocked_dates")
        .select("start_date, end_date, source, reason")
        .eq("vehicle_id", vehicleId)
        .lte("start_date", returnDate)
        .gte("end_date", pickupDate);

      if (blocks && blocks.length > 0) {
        blockedConflict = true;
      }
    }

    return NextResponse.json({
      success: true,
      hasOverlap: hasRealOverlap || blockedConflict,
      conflicting: conflicting || [],
      blockedDates: blockedConflict ? "Vehicle has blocked dates in this range (Turo or manual block)" : null,
    });
  } catch (error) {
    logger.error("Check overlap error:", error);
    return NextResponse.json(
      { success: false, hasOverlap: false, message: "Failed to check overlap" },
      { status: 500 }
    );
  }
}
