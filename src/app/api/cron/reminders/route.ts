import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { sendPickupReminder, sendReturnReminder } from "@/lib/email/mailer";

// This endpoint runs daily via Vercel Cron
// Sends pickup reminders (24h before) and return reminders (day of return)

export async function GET(request: Request) {
  const supabase = getServiceSupabase();
  // Verify cron secret (optional security)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStr = today.toISOString().split("T")[0];
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    let pickupCount = 0;
    let returnCount = 0;

    // 1. Pickup reminders: bookings with pickup_date = tomorrow, status = confirmed
    const { data: pickupBookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("pickup_date", tomorrowStr)
      .eq("status", "confirmed");

    if (pickupBookings && pickupBookings.length > 0) {
      for (const booking of pickupBookings) {
        if (!booking.customer_email) continue; // Skip if no email
        try {
          const { data: vehicle } = await supabase
            .from("vehicles")
            .select("year, make, model")
            .eq("id", booking.vehicle_id)
            .single();

          await sendPickupReminder({
            bookingId: booking.id,
            customerName: booking.customer_name || "Customer",
            customerEmail: booking.customer_email,
            vehicleName: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Vehicle",
            pickupDate: booking.pickup_date,
            returnDate: booking.return_date,
            totalPrice: booking.total_price,
            deposit: booking.deposit,
          });
          pickupCount++;
        } catch (err) {
          console.error(`Failed to send pickup reminder for booking ${booking.id}:`, err);
        }
      }
    }

    // 2. Return reminders: bookings with return_date = today, status = active
    const { data: returnBookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("return_date", todayStr)
      .eq("status", "active");

    if (returnBookings && returnBookings.length > 0) {
      for (const booking of returnBookings) {
        if (!booking.customer_email) continue; // Skip if no email
        try {
          const { data: vehicle } = await supabase
            .from("vehicles")
            .select("year, make, model")
            .eq("id", booking.vehicle_id)
            .single();

          await sendReturnReminder({
            bookingId: booking.id,
            customerName: booking.customer_name || "Customer",
            customerEmail: booking.customer_email,
            vehicleName: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Vehicle",
            pickupDate: booking.pickup_date,
            returnDate: booking.return_date,
            totalPrice: booking.total_price,
            deposit: booking.deposit,
          });
          returnCount++;
        } catch (err) {
          console.error(`Failed to send return reminder for booking ${booking.id}:`, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${pickupCount} pickup reminders and ${returnCount} return reminders`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron reminder error:", error);
    return NextResponse.json({ error: "Failed to send reminders" }, { status: 500 });
  }
}
