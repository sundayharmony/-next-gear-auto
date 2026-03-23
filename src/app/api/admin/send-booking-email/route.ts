import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { sendBookingSignAgreement } from "@/lib/email/mailer";
import { logger } from "@/lib/utils/logger";

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: "bookingId is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Fetch the booking with vehicle info
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 }
      );
    }

    if (!booking.customer_email) {
      return NextResponse.json(
        { success: false, message: "Booking has no customer email" },
        { status: 400 }
      );
    }

    // Fetch vehicle name
    let vehicleName = "Vehicle";
    if (booking.vehicle_id) {
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("year, make, model")
        .eq("id", booking.vehicle_id)
        .single();

      if (vehicle) {
        vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
      }
    }

    // Send the email
    await sendBookingSignAgreement({
      bookingId: booking.id,
      customerName: booking.customer_name || "Valued Customer",
      customerEmail: booking.customer_email,
      vehicleName,
      pickupDate: booking.pickup_date,
      returnDate: booking.return_date,
      pickupTime: booking.pickup_time || undefined,
      returnTime: booking.return_time || undefined,
      totalPrice: booking.total_price || 0,
      deposit: booking.deposit || 0,
    });

    return NextResponse.json({
      success: true,
      message: `Booking email sent to ${booking.customer_email}`,
    });
  } catch (error) {
    logger.error("Send booking email error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send booking email" },
      { status: 500 }
    );
  }
}
