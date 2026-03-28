import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { sendPickupReminder, sendReturnReminder } from "@/lib/email/mailer";
import { logger } from "@/lib/utils/logger";

// This endpoint runs daily via Vercel Cron
// Sends pickup reminders (24h before) and return reminders (day of return)

export async function GET(request: Request) {
  const supabase = getServiceSupabase();
  // Verify cron secret (required security)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Use timezone-aware date calculation
    const tz = process.env.BUSINESS_TIMEZONE || "America/New_York";
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA", { timeZone: tz });
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString("en-CA", { timeZone: tz });

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
            vehicleName: vehicle ? `${vehicle.year ?? ""} ${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || "Vehicle" : "Vehicle",
            pickupDate: booking.pickup_date,
            returnDate: booking.return_date,
            totalPrice: booking.total_price ?? 0,
            deposit: booking.deposit ?? 0,
          });
          pickupCount++;
        } catch (err) {
          logger.error(`Failed to send pickup reminder for booking ${booking.id}:`, err);
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
            vehicleName: vehicle ? `${vehicle.year ?? ""} ${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || "Vehicle" : "Vehicle",
            pickupDate: booking.pickup_date,
            returnDate: booking.return_date,
            totalPrice: booking.total_price ?? 0,
            deposit: booking.deposit ?? 0,
          });
          returnCount++;
        } catch (err) {
          logger.error(`Failed to send return reminder for booking ${booking.id}:`, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${pickupCount} pickup reminders and ${returnCount} return reminders`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Cron reminder error:", error);
    return NextResponse.json({ error: "Failed to send reminders" }, { status: 500 });
  }
}
