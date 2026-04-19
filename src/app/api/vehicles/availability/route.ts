import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";
import { bookingConflictsWithAny, overlapConfigForMode, toBookingInterval } from "@/lib/utils/booking-overlap";

export async function GET(req: NextRequest) {
  const supabase = getServiceSupabase();
  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get("vehicleId");
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");

    if (!vehicleId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "vehicleId, start, and end params are required" },
        { status: 400 }
      );
    }

    // Validate date format
    const startParsed = new Date(startDate.includes("T") ? startDate : startDate + "T00:00:00");
    const endParsed = new Date(endDate.includes("T") ? endDate : endDate + "T00:00:00");
    if (isNaN(startParsed.getTime()) || isNaN(endParsed.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid date format - use ISO 8601 format (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    if (endParsed < startParsed) {
      return NextResponse.json(
        { success: false, error: "End date must be after start date" },
        { status: 400 }
      );
    }

    const { statuses, minGapMinutes } = overlapConfigForMode("default");

    const { data: conflicting, error } = await supabase
      .from("bookings")
      .select("id, pickup_date, return_date, pickup_time, return_time, status")
      .eq("vehicle_id", vehicleId)
      .in("status", [...statuses])
      .lte("pickup_date", endDate)
      .gte("return_date", startDate);

    if (error) {
      logger.error("Availability check error:", error);
      // On database error, return unavailable to prevent overbooking
      return NextResponse.json({
        success: false,
        error: "Unable to verify availability - please try again",
        data: { available: false, fallback: true },
      }, { status: 503 });
    }

    // Allow same-day turnovers with at least 60-minute gap (shared logic with POST /api/bookings)
    let available = true;
    if (conflicting && conflicting.length > 0) {
      const pickupTime = searchParams.get("pickupTime") || "00:00";
      const returnTime = searchParams.get("returnTime") || "23:59";
      const proposed = toBookingInterval(startDate, endDate, pickupTime, returnTime);
      const hasRealConflict = bookingConflictsWithAny(proposed, conflicting, minGapMinutes);
      available = !hasRealConflict;
    }

    // Also check blocked_dates (manual blocks, Turo email sync, etc.)
    if (available) {
      const { data: blocks } = await supabase
        .from("blocked_dates")
        .select("id")
        .eq("vehicle_id", vehicleId)
        .lte("start_date", endDate)
        .gte("end_date", startDate)
        .limit(1);

      if (blocks && blocks.length > 0) {
        available = false;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        available,
        conflictingBookings: conflicting?.length ?? 0,
      },
    });
  } catch (err) {
    logger.error("Availability API error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to check availability" },
      { status: 500 }
    );
  }
}
