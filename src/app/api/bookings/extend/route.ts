import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { getAuthFromRequest } from "@/lib/auth/jwt";
import { logger } from "@/lib/utils/logger";
import { sendBookingExtended } from "@/lib/email/mailer";
import { getVehicleDisplayName } from "@/lib/types";
import { checkBookingOverlap } from "@/lib/utils/booking-overlap";
import Stripe from "stripe";

/** Matches IDs from create booking: `bk` + 7 hex chars (see POST /api/bookings). */
const BOOKING_ID_RE = /^bk[0-9a-f]{7}$/i;

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check - admin only
    const auth = await getAuthFromRequest(request);
    if (!auth || auth.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Parse and validate body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { bookingId, newReturnDate, newReturnTime, extensionAmount } = body;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!bookingId || (!BOOKING_ID_RE.test(bookingId) && !uuidRegex.test(bookingId))) {
      return NextResponse.json(
        { success: false, message: "Valid bookingId is required" },
        { status: 400 }
      );
    }

    // Validate newReturnDate format
    if (!newReturnDate || !/^\d{4}-\d{2}-\d{2}$/.test(newReturnDate)) {
      return NextResponse.json(
        { success: false, message: "newReturnDate must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    // Validate extensionAmount
    if (extensionAmount === undefined || !Number.isFinite(extensionAmount) || extensionAmount < 0) {
      return NextResponse.json(
        { success: false, message: "extensionAmount must be a non-negative number" },
        { status: 400 }
      );
    }

    // Validate optional newReturnTime
    if (newReturnTime && !/^\d{2}:\d{2}$/.test(newReturnTime)) {
      return NextResponse.json(
        { success: false, message: "newReturnTime must be in HH:MM format" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // 3. Fetch existing booking
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (fetchError || !booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 }
      );
    }

    // 4. Validate booking status - only confirmed or active bookings can be extended
    if (!["confirmed", "active"].includes(booking.status)) {
      return NextResponse.json(
        { success: false, message: `Cannot extend a booking with status "${booking.status}". Only confirmed or active bookings can be extended.` },
        { status: 400 }
      );
    }

    // 5. Validate new return date is after current return date
    const currentReturn = new Date(booking.return_date + "T00:00:00");
    const newReturn = new Date(newReturnDate + "T00:00:00");
    if (newReturn <= currentReturn) {
      return NextResponse.json(
        { success: false, message: "New return date must be after the current return date" },
        { status: 400 }
      );
    }

    // Calculate extension days
    const extensionDays = Math.ceil(
      (newReturn.getTime() - currentReturn.getTime()) / (1000 * 60 * 60 * 24)
    );

    const effectiveReturnTime = newReturnTime ?? booking.return_time ?? null;

    const overlap = await checkBookingOverlap(
      supabase,
      booking.vehicle_id,
      booking.pickup_date,
      newReturnDate,
      booking.pickup_time ?? null,
      effectiveReturnTime ?? null,
      { mode: "default", excludeBookingId: bookingId },
    );
    if (overlap) return overlap;

    // 6. Fetch vehicle for display name
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("*")
      .eq("id", booking.vehicle_id)
      .maybeSingle();

    const vehicleName = vehicle ? getVehicleDisplayName(vehicle) : "Vehicle";

    // 7. Store original values for the activity log
    const originalReturnDate = booking.return_date;
    const originalReturnTime = booking.return_time;
    const originalTotalPrice = booking.total_price;

    // 8. Calculate new total price
    const newTotalPrice = Number(booking.total_price) + extensionAmount;

    // 9. Create Stripe payment link if extension amount > 0
    let stripeSessionUrl: string | null = null;
    let stripeSessionId: string | null = null;

    if (extensionAmount > 0) {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        return NextResponse.json(
          { success: false, message: "Payment processing is not configured" },
          { status: 500 }
        );
      }

      const stripe = new Stripe(stripeKey);
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rentnextgearauto.com";

      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card", "cashapp", "link"],
          mode: "payment",
          customer_email: booking.customer_email,
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: `Trip Extension - ${vehicleName}`,
                  description: `Extension of ${extensionDays} day${extensionDays > 1 ? "s" : ""}: ${booking.return_date} → ${newReturnDate}`,
                },
                unit_amount: Math.max(1, Math.round(extensionAmount * 100)),
              },
              quantity: 1,
            },
          ],
          metadata: {
            booking_id: bookingId,
            extension: "true",
            original_return_date: booking.return_date,
            new_return_date: newReturnDate,
            extension_days: extensionDays.toString(),
          },
          success_url: `${siteUrl}/booking/success?booking_id=${bookingId}&extended=true`,
          cancel_url: `${siteUrl}/account`,
        });

        stripeSessionUrl = session.url;
        stripeSessionId = session.id;
      } catch (stripeError) {
        logger.error("Stripe session creation failed for extension:", stripeError);
        return NextResponse.json(
          { success: false, message: "Failed to create payment session" },
          { status: 500 }
        );
      }
    }

    // 10. Update the booking
    const updateData: Record<string, unknown> = {
      return_date: newReturnDate,
      total_price: newTotalPrice,
    };
    if (newReturnTime) {
      updateData.return_time = newReturnTime;
    }

    const { error: updateError } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId);

    if (updateError) {
      logger.error("Failed to update booking for extension:", updateError);
      return NextResponse.json(
        { success: false, message: "Failed to update booking" },
        { status: 500 }
      );
    }

    // 11. Log the extension activity
    await supabase.from("booking_activity").insert({
      booking_id: bookingId,
      action: "booking_extended",
      details: {
        original_return_date: originalReturnDate,
        new_return_date: newReturnDate,
        original_return_time: originalReturnTime,
        new_return_time: newReturnTime || originalReturnTime,
        extension_days: extensionDays,
        extension_amount: extensionAmount,
        original_total: originalTotalPrice,
        new_total: newTotalPrice,
        stripe_session_id: stripeSessionId,
      },
      performed_by: auth.email || auth.sub,
    });

    // 12. Update blocked_dates if they exist for this booking
    // Find blocked dates matching this vehicle and the booking's pickup/return range
    const { data: blockedDates } = await supabase
      .from("blocked_dates")
      .select("id")
      .eq("vehicle_id", booking.vehicle_id)
      .eq("start_date", booking.pickup_date)
      .eq("end_date", originalReturnDate);

    if (blockedDates && blockedDates.length > 0) {
      await supabase
        .from("blocked_dates")
        .update({
          end_date: newReturnDate,
          is_extension: true,
          original_end_date: originalReturnDate,
        })
        .eq("id", blockedDates[0].id);
    }

    // 13. Record extension payment (if amount > 0)
    if (extensionAmount > 0) {
      await supabase.from("booking_payments").insert({
        booking_id: bookingId,
        amount: extensionAmount,
        method: "stripe",
        note: `Trip extension: ${extensionDays} day${extensionDays > 1 ? "s" : ""} (${originalReturnDate} → ${newReturnDate})`,
      });
    }

    // 14. Send extension email to customer
    try {
      await sendBookingExtended({
        bookingId,
        customerName: booking.customer_name || "Customer",
        customerEmail: booking.customer_email,
        vehicleName,
        pickupDate: booking.pickup_date,
        originalReturnDate,
        newReturnDate,
        newReturnTime: newReturnTime || booking.return_time,
        extensionDays,
        extensionAmount,
        newTotalPrice,
        paymentLink: stripeSessionUrl || undefined,
      });
    } catch (emailError) {
      logger.error("Failed to send extension email:", emailError);
      // Don't fail the request if email fails
    }

    // 15. Return success
    return NextResponse.json({
      success: true,
      message: `Booking extended by ${extensionDays} day${extensionDays > 1 ? "s" : ""}`,
      data: {
        bookingId,
        newReturnDate,
        newReturnTime: newReturnTime || booking.return_time,
        extensionDays,
        extensionAmount,
        newTotalPrice,
        paymentUrl: stripeSessionUrl,
        stripeSessionId,
      },
    });
  } catch (error) {
    logger.error("Extend booking error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
