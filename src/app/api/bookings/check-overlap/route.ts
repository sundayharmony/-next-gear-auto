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
      .select("id, pickup_date, return_date, customer_name, status")
      .eq("vehicle_id", vehicleId)
      .in("status", ["confirmed", "active", "pending"])
      .lte("pickup_date", returnDate)
      .gte("return_date", pickupDate);

    return NextResponse.json({
      success: true,
      hasOverlap: (conflicting && conflicting.length > 0) || false,
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
