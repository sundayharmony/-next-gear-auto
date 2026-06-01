import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { getAuthFromRequest } from "@/lib/auth/jwt";
import { tokenHasOwnerAccess } from "@/lib/auth/roles";
import { getOwnerVehicleIds } from "@/lib/owner/owner-check";
import { logger } from "@/lib/utils/logger";
import { isYyyyMmDd, isoDateOrderingOk } from "@/lib/utils/booking-dates";
import { formatYyyyMmDdLocal } from "@/lib/utils/booking-dates";
import {
  bookingConflictsWithAny,
  filterOccupyingBookings,
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
  const staffAuth = await verifyAdminOrManager(req);
  let overlapMode: BookingOverlapMode = "default";
  let ownerId: string | null = null;

  if (staffAuth.authorized) {
    overlapMode = staffAuth.role === "manager" ? "manager" : "default";
  } else {
    const token = await getAuthFromRequest(req);
    if (!token || !tokenHasOwnerAccess(token)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }
    ownerId = token.sub;
    overlapMode = "manager";
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

    if (!isYyyyMmDd(pickupDate) || !isYyyyMmDd(returnDate)) {
      return NextResponse.json(
        { success: false, hasOverlap: false, message: "pickupDate and returnDate must be YYYY-MM-DD" },
        { status: 400 },
      );
    }
    if (!isoDateOrderingOk(pickupDate, returnDate)) {
      return NextResponse.json(
        { success: false, hasOverlap: false, message: "returnDate must be on or after pickupDate" },
        { status: 400 },
      );
    }

    if (ownerId && vehicleId) {
      const owned = await getOwnerVehicleIds(ownerId);
      if (!owned.includes(vehicleId)) {
        return NextResponse.json(
          { success: false, hasOverlap: false, message: "Vehicle not in your fleet" },
          { status: 403 }
        );
      }
    }

    const { statuses, minGapMinutes } = overlapConfigForMode(overlapMode);

    const supabase = getServiceSupabase();

    const today = formatYyyyMmDdLocal(new Date());

    const { data: conflictingRaw } = await supabase
      .from("bookings")
      .select("id, pickup_date, return_date, pickup_time, return_time, customer_name, status, admin_notes")
      .eq("vehicle_id", vehicleId)
      .in("status", [...statuses])
      .lte("pickup_date", returnDate);

    const conflicting = filterOccupyingBookings(
      conflictingRaw || [],
      pickupDate,
      returnDate,
      today
    );

    const proposed = toBookingInterval(pickupDate, returnDate, pickupTime, returnTime);

    let hasRealOverlap = false;
    if (conflicting.length > 0) {
      hasRealOverlap = bookingConflictsWithAny(proposed, conflicting, minGapMinutes, today);
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
