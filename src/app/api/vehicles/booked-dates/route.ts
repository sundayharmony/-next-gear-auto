import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";

function isMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const anyErr = error as { code?: string; message?: string };
  return anyErr.code === "42703" || /column\s+.+\s+does\s+not\s+exist/i.test(anyErr.message || "");
}

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
      .select("id, pickup_date, return_date, pickup_time, return_time, status")
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

    // Return booking date ranges with time info for 60-minute gap checks
    // Note: IDs and status are excluded to avoid leaking internal booking details
    const bookedRanges = (bookings || []).map((b) => ({
      pickupDate: b.pickup_date,
      returnDate: b.return_date,
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
