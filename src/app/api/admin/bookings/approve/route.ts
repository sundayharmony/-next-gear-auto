import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { sendBookingApprovedPaymentLink } from "@/lib/email/mailer";
import { logger } from "@/lib/utils/logger";
import { getVehicleDisplayName } from "@/lib/types";

function getStripe(): Stripe {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(stripeKey);
}

const BOOKING_ID_RE = /^bk[0-9a-f]{7}$/i;

export async function POST(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;

  try {
    let body: { bookingId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const bookingId = typeof body.bookingId === "string" ? body.bookingId.trim() : "";
    if (!bookingId || !BOOKING_ID_RE.test(bookingId)) {
      return NextResponse.json(
        { success: false, message: "Valid bookingId is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

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

    if (booking.status !== "pending_approval") {
      return NextResponse.json(
        { success: false, message: `Booking is not pending approval (current status: ${booking.status})` },
        { status: 400 }
      );
    }

    if (!booking.customer_email) {
      return NextResponse.json(
        { success: false, message: "Booking has no customer email" },
        { status: 400 }
      );
    }

    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("year, make, model")
      .eq("id", booking.vehicle_id)
      .maybeSingle();

    const vehicleName = vehicle ? getVehicleDisplayName(vehicle) : "Vehicle";

    const chargeAmount = Math.max(0, (booking.total_price || 0) - (booking.credit_applied || 0));

    if (chargeAmount <= 0) {
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status: "pending" })
        .eq("id", bookingId)
        .eq("status", "pending_approval");

      if (updateError) {
        logger.error("Failed to approve free booking:", updateError);
        return NextResponse.json(
          { success: false, message: "Failed to approve booking" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Booking approved (no payment required)",
        data: { bookingId, paymentRequired: false },
      });
    }

    if (!process.env.STRIPE_SECRET_KEY?.trim()) {
      return NextResponse.json(
        { success: false, message: "Payment processing is not configured" },
        { status: 503 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rentnextgearauto.com";

    let session: Stripe.Checkout.Session;
    try {
      session = await getStripe().checkout.sessions.create({
        payment_method_types: ["card", "cashapp", "link"],
        mode: "payment",
        customer_email: booking.customer_email,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `NextGearAuto - Vehicle Rental`,
                description: `${vehicleName} rental: ${booking.pickup_date}${booking.pickup_time ? " at " + booking.pickup_time : ""} to ${booking.return_date}${booking.return_time ? " at " + booking.return_time : ""}`,
              },
              unit_amount: Math.max(1, Math.round(chargeAmount * 100)),
            },
            quantity: 1,
          },
        ],
        metadata: {
          booking_id: bookingId,
          customer_id: booking.customer_id || "",
          vehicle_id: booking.vehicle_id,
          total_price: (booking.total_price || 0).toString(),
          promo_code: booking.promo_code || "",
          discount_amount: (booking.discount_amount || 0).toString(),
          credit_applied: (booking.credit_applied || 0).toString(),
        },
        success_url: `${siteUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
        cancel_url: `${siteUrl}/booking/payment?booking_id=${bookingId}`,
        expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      });
    } catch (stripeError) {
      logger.error("Stripe session creation failed:", stripeError);
      return NextResponse.json(
        { success: false, message: "Failed to create payment session" },
        { status: 502 }
      );
    }

    if (!session.url) {
      logger.error("Stripe session missing URL", { sessionId: session.id });
      return NextResponse.json(
        { success: false, message: "Failed to create payment link" },
        { status: 502 }
      );
    }

    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "pending",
        stripe_session_id: session.id,
      })
      .eq("id", bookingId)
      .eq("status", "pending_approval");

    if (updateError) {
      logger.error("Failed to update booking status:", updateError);
      return NextResponse.json(
        { success: false, message: "Failed to approve booking" },
        { status: 500 }
      );
    }

    const emailData = {
      bookingId,
      customerName: booking.customer_name || "Customer",
      customerEmail: booking.customer_email,
      vehicleName,
      pickupDate: booking.pickup_date,
      returnDate: booking.return_date,
      pickupTime: booking.pickup_time || undefined,
      returnTime: booking.return_time || undefined,
      totalPrice: booking.total_price || 0,
      deposit: chargeAmount,
      paymentUrl: session.url,
    };

    sendBookingApprovedPaymentLink(emailData).catch((error) => {
      logger.error("Failed to send payment link email:", error);
    });

    return NextResponse.json({
      success: true,
      message: "Booking approved. Payment link sent to customer.",
      data: {
        bookingId,
        paymentRequired: true,
        paymentUrl: session.url,
        stripeSessionId: session.id,
      },
    });
  } catch (error) {
    logger.error("Approve booking error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to approve booking" },
      { status: 500 }
    );
  }
}
