import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import {
  sendPickupReminder,
  sendReturnReminder,
  sendRecurringPaymentReminder,
} from "@/lib/email/mailer";
import { logger } from "@/lib/utils/logger";
import { getVehicleDisplayName } from "@/lib/types";
import {
  getRecurringBillingSummary,
  getStagedRecurringReturnDate,
  isRecurringLongTermBooking,
  isWeeklyDueOnDate,
  parseRecurringBookingMeta,
} from "@/lib/utils/recurring-booking";

// This endpoint runs daily via Vercel Cron
// Sends pickup reminders (24h before), return reminders (day of return),
// advances recurring billing periods, and weekly payment due reminders.

export async function GET(request: Request) {
  const supabase = getServiceSupabase();
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tz = "America/New_York";
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA", { timeZone: tz });
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString("en-CA", { timeZone: tz });

    let pickupCount = 0;
    let returnCount = 0;
    let paymentReminderCount = 0;
    let advancedPeriodCount = 0;

    const { data: activeRecurring } = await supabase
      .from("bookings")
      .select("id, return_date, admin_notes, status")
      .in("status", ["active", "confirmed"])
      .limit(500);

    for (const row of activeRecurring || []) {
      if (!isRecurringLongTermBooking(row.admin_notes)) continue;
      const staged = getStagedRecurringReturnDate(row.return_date, row.admin_notes, todayStr);
      if (!staged) continue;
      const { error } = await supabase
        .from("bookings")
        .update({ return_date: staged })
        .eq("id", row.id);
      if (error) {
        logger.error(`Failed to advance recurring return_date for ${row.id}:`, error);
      } else {
        advancedPeriodCount++;
      }
    }

    const { data: pickupBookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("pickup_date", tomorrowStr)
      .eq("status", "confirmed");

    if (pickupBookings && pickupBookings.length > 0) {
      for (const booking of pickupBookings) {
        if (!booking.customer_email) continue;
        try {
          const { data: vehicle, error: vehicleError } = await supabase
            .from("vehicles")
            .select("year, make, model")
            .eq("id", booking.vehicle_id)
            .maybeSingle();

          if (vehicleError) {
            logger.error(`Failed to fetch vehicle for booking ${booking.id}:`, vehicleError);
          }

          await sendPickupReminder({
            bookingId: booking.id,
            customerName: booking.customer_name || "Customer",
            customerEmail: booking.customer_email,
            vehicleName: vehicle ? getVehicleDisplayName(vehicle) : "Vehicle",
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

    const { data: returnBookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("return_date", todayStr)
      .eq("status", "active");

    if (returnBookings && returnBookings.length > 0) {
      for (const booking of returnBookings) {
        if (!booking.customer_email) continue;
        if (isRecurringLongTermBooking(booking.admin_notes)) continue;

        try {
          const { data: vehicle, error: vehicleError } = await supabase
            .from("vehicles")
            .select("year, make, model")
            .eq("id", booking.vehicle_id)
            .maybeSingle();

          if (vehicleError) {
            logger.error(`Failed to fetch vehicle for booking ${booking.id}:`, vehicleError);
          }

          await sendReturnReminder({
            bookingId: booking.id,
            customerName: booking.customer_name || "Customer",
            customerEmail: booking.customer_email,
            vehicleName: vehicle ? getVehicleDisplayName(vehicle) : "Vehicle",
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

    const { data: recurringActive } = await supabase
      .from("bookings")
      .select("*")
      .eq("status", "active")
      .limit(500);

    for (const booking of recurringActive || []) {
      const meta = parseRecurringBookingMeta(booking.admin_notes);
      if (!meta.isRecurringLongTerm || !meta.weeklyDueDay) continue;
      if (!isWeeklyDueOnDate(meta.weeklyDueDay, todayStr)) continue;

      const billing = getRecurringBillingSummary(
        {
          pickup_date: booking.pickup_date,
          total_price: booking.total_price,
          deposit: booking.deposit,
          admin_notes: booking.admin_notes,
        },
        todayStr
      );
      if (!billing || billing.balanceDue <= 0 || !booking.customer_email) continue;

      try {
        const { data: vehicle } = await supabase
          .from("vehicles")
          .select("year, make, model")
          .eq("id", booking.vehicle_id)
          .maybeSingle();

        await sendRecurringPaymentReminder({
          bookingId: booking.id,
          customerName: booking.customer_name || "Customer",
          customerEmail: booking.customer_email,
          vehicleName: vehicle ? getVehicleDisplayName(vehicle) : "Vehicle",
          pickupDate: booking.pickup_date,
          returnDate: booking.return_date,
          totalPrice: booking.total_price ?? 0,
          deposit: booking.deposit ?? 0,
          balanceDue: billing.balanceDue,
        });
        paymentReminderCount++;
      } catch (err) {
        logger.error(`Failed to send recurring payment reminder for ${booking.id}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${pickupCount} pickup, ${returnCount} return, ${paymentReminderCount} weekly payment reminders; advanced ${advancedPeriodCount} recurring periods`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Cron reminder error:", error);
    return NextResponse.json({ error: "Failed to send reminders" }, { status: 500 });
  }
}
