import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { sendBookingSignAgreement } from "@/lib/email/mailer";
import { logger } from "@/lib/utils/logger";
import { getVehicleDisplayName } from "@/lib/types";

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const { bookingId, resetAgreement } = body;

    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: "bookingId is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // If resetAgreement is true, clear the existing agreement so the customer
    // can sign a fresh one from the link we're about to send.
    if (resetAgreement) {
      const { error: resetError } = await supabase
        .from("bookings")
        .update({
          agreement_signed_at: null,
          rental_agreement_url: null,
          signed_name: null,
        })
        .eq("id", bookingId);

      if (resetError) {
        logger.error("Failed to reset agreement:", resetError);
        return NextResponse.json(
          { success: false, message: "Failed to reset existing agreement" },
          { status: 500 }
        );
      }
    }

    // Fetch the booking with vehicle info
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

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
      const { data: vehicle, error: vehicleError } = await supabase
        .from("vehicles")
        .select("year, make, model")
        .eq("id", booking.vehicle_id)
        .maybeSingle();

      if (vehicleError) {
        logger.error("Failed to fetch vehicle:", vehicleError);
      } else if (vehicle) {
        vehicleName = getVehicleDisplayName(vehicle);
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
      message: `${resetAgreement ? "Agreement reset and email" : "Email"} sent to ${booking.customer_email}`,
    });
  } catch (error) {
    logger.error("Send booking email error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send booking email" },
      { status: 500 }
    );
  }
}
