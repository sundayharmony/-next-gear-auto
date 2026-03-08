import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";

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
    const startParsed = new Date(startDate);
    const endParsed = new Date(endDate);
    if (isNaN(startParsed.getTime()) || isNaN(endParsed.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid date format - use ISO 8601 format (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    if (endParsed <= startParsed) {
      return NextResponse.json(
        { success: false, error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Check for overlapping confirmed/active bookings in Supabase
    const { data: conflicting, error } = await supabase
      .from("bookings")
      .select("id, pickup_date, return_date, status")
      .eq("vehicle_id", vehicleId)
      .in("status", ["confirmed", "active", "pending"])
      .lte("pickup_date", endDate)
      .gte("return_date", startDate);

    if (error) {
      console.error("Availability check error:", error);
      // On database error, return unavailable to prevent overbooking
      return NextResponse.json({
        success: false,
        error: "Unable to verify availability - please try again",
        data: { available: false, fallback: true },
      }, { status: 503 });
    }

    const available = !conflicting || conflicting.length === 0;

    return NextResponse.json({
      success: true,
      data: {
        available,
        conflictingBookings: conflicting?.length ?? 0,
      },
    });
  } catch (err) {
    console.error("Availability API error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to check availability" },
      { status: 500 }
    );
  }
}
