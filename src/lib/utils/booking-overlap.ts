import { NextResponse } from "next/server";

/**
 * Check for booking overlap; returns a 409 response if conflict found, or null if clear.
 * Allows same-day turnovers if bookings are 60+ minutes apart.
 */
export async function checkBookingOverlap(
  supabase: any,
  vehicleId: string,
  pickupDate: string,
  returnDate: string,
  pickupTime: string | null,
  returnTime: string | null,
): Promise<NextResponse | null> {
  const { data: conflicting } = await supabase
    .from("bookings")
    .select("id, pickup_date, return_date, pickup_time, return_time")
    .eq("vehicle_id", vehicleId)
    .in("status", ["confirmed", "active", "pending"])
    .lte("pickup_date", returnDate)
    .gte("return_date", pickupDate);

  if (conflicting && conflicting.length > 0) {
    const newPickup = new Date(`${pickupDate}T${pickupTime ?? "00:00"}`);
    const newReturn = new Date(`${returnDate}T${returnTime ?? "23:59"}`);

    const hasRealConflict = conflicting.some((existing: any) => {
      const existPickup = new Date(`${existing.pickup_date}T${existing.pickup_time ?? "00:00"}`);
      const existReturn = new Date(`${existing.return_date}T${existing.return_time ?? "23:59"}`);
      const gapAfterExisting = (newPickup.getTime() - existReturn.getTime()) / 60000;
      const gapAfterNew = (existPickup.getTime() - newReturn.getTime()) / 60000;
      return gapAfterExisting < 60 && gapAfterNew < 60;
    });

    if (hasRealConflict) {
      return NextResponse.json(
        { success: false, message: "This vehicle is already booked for the selected dates. Bookings on the same day must be at least 60 minutes apart." },
        { status: 409 }
      );
    }
  }
  return null;
}
