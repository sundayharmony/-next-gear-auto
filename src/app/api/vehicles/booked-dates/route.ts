import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";
import { isMissingColumnError } from "@/lib/utils/supabase-column-errors";
import { formatYyyyMmDdLocal } from "@/lib/utils/booking-dates";
import { getBookingOccupancyEndDate } from "@/lib/utils/recurring-booking";

export async function GET(req: NextRequest) {
  const supabase = getServiceSupabase();
  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get("vehicleId");

    if (!vehicleId) {
      return NextResponse.json(
        { success: false, error: "vehicleId param is required" },
        { status: 400 }
      );
    }

    // Bookings that occupy the vehicle on the calendar (includes pending website holds + confirmed/active)
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("id, pickup_date, return_date, pickup_time, return_time, status, admin_notes")
      .eq("vehicle_id", vehicleId)
      .in("status", ["confirmed", "active", "pending"])
      .order("pickup_date", { ascending: true })
      .limit(500);

    if (error) {
      logger.error("Booked dates fetch error:", error);
      return NextResponse.json({
        success: false,
        error: "Failed to fetch booked dates",
      }, { status: 500 });
    }

    const today = formatYyyyMmDdLocal(new Date());

    // Return booking date ranges with time info for 60-minute gap checks.
    // Recurring long-term uses rolled/active occupancy end (not stale stored return_date).
    const bookedRanges = (bookings || []).map((b) => ({
      pickupDate: b.pickup_date,
      returnDate: getBookingOccupancyEndDate(
        {
          pickup_date: b.pickup_date,
          return_date: b.return_date,
          admin_notes: b.admin_notes,
          status: b.status,
        },
        today
      ),
      pickupTime: b.pickup_time || "00:00",
      returnTime: b.return_time || "23:59",
    }));

    // Also fetch blocked dates (manual blocks, Turo email sync, etc.)
    let { data: blocks, error: blocksError } = await supabase
      .from("blocked_dates")
      .select("start_date, end_date, pickup_time, return_time")
      .eq("vehicle_id", vehicleId)
      .order("start_date", { ascending: true });

    if (blocksError && isMissingColumnError(blocksError)) {
      const fallback = await supabase
        .from("blocked_dates")
        .select("start_date, end_date")
        .eq("vehicle_id", vehicleId)
        .order("start_date", { ascending: true });

      blocks = fallback.data as Array<{ start_date: string; end_date: string; pickup_time?: string | null; return_time?: string | null }> | null;
      blocksError = fallback.error;
    }

    if (blocksError) {
      logger.error("Blocked dates fetch error:", blocksError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch blocked dates" },
        { status: 500 }
      );
    }

    const blockedRanges = (blocks || []).map(
      (b: { start_date: string; end_date: string; pickup_time?: string | null; return_time?: string | null }) => ({
        pickupDate: b.start_date,
        returnDate: b.end_date,
        pickupTime: b.pickup_time?.trim() || "00:00",
        returnTime: b.return_time?.trim() || "23:59",
      }),
    );

    return NextResponse.json(
      {
        success: true,
        data: [...bookedRanges, ...blockedRanges],
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (err) {
    logger.error("Booked dates API error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch booked dates" },
      { status: 500 }
    );
  }
}
