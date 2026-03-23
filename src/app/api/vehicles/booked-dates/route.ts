import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";

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

    // Fetch all non-cancelled bookings for this vehicle
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("id, pickup_date, return_date, pickup_time, return_time, status")
      .eq("vehicle_id", vehicleId)
      .in("status", ["confirmed", "active", "pending"])
      .order("pickup_date", { ascending: true });

    if (error) {
      logger.error("Booked dates fetch error:", error);
      return NextResponse.json({
        success: false,
        error: "Failed to fetch booked dates",
      }, { status: 500 });
    }

    // Return booking date ranges with time info for 60-minute gap checks
    const bookedRanges = (bookings || []).map((b) => ({
      id: b.id,
      pickupDate: b.pickup_date,
      returnDate: b.return_date,
      pickupTime: b.pickup_time || "00:00",
      returnTime: b.return_time || "23:59",
      status: b.status,
    }));

    return NextResponse.json({
      success: true,
      data: bookedRanges,
    });
  } catch (err) {
    logger.error("Booked dates API error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch booked dates" },
      { status: 500 }
    );
  }
}
