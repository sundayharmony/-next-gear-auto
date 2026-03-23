import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServiceSupabase } from "@/lib/db/supabase";
import { sendBookingConfirmation, sendAdminNewBooking } from "@/lib/email/mailer";
import { logger } from "@/lib/utils/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const supabase = getServiceSupabase();
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  // If webhook secret is configured, verify signature
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;

  try {
    if (webhookSecret && webhookSecret !== "whsec_REPLACE_WITH_ACTUAL_WEBHOOK_SECRET" && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else if (process.env.NODE_ENV === "development") {
      // Allow unverified events in development only
      logger.warn("DEV WARNING: Webhook secret not configured - parsing unverified event");
      event = JSON.parse(body) as Stripe.Event;
    } else {
      logger.error("SECURITY: Webhook secret not configured in production - rejecting request");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }
  } catch (err) {
    logger.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;

        if (bookingId) {
          // Check current booking status for idempotency
          const { data: existingBooking } = await supabase
            .from("bookings")
            .select("status")
            .eq("id", bookingId)
            .single();

          // Only update if not already confirmed
          if (existingBooking?.status !== "confirmed") {
            const { error: updateError } = await supabase
              .from("bookings")
              .update({
                status: "confirmed",
                stripe_payment_intent: session.payment_intent as string,
              })
              .eq("id", bookingId);

            if (updateError) {
              logger.error("Error updating booking status:", updateError);
            }
          }

          // Create payment record
          const { error: paymentError } = await supabase.from("payment_records").insert({
            id: "pay" + Date.now(),
            booking_id: bookingId,
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent as string,
            amount: (session.amount_total ?? 0) / 100,
            status: "succeeded",
          });

          if (paymentError) {
            logger.error("Error creating payment record:", paymentError);
          }

          // Fetch booking details for email
          const { data: booking } = await supabase
            .from("bookings")
            .select("*")
            .eq("id", bookingId)
            .single();

          if (booking) {
            // Only send confirmation emails if customer email exists
            if (!booking.customer_email) {
              logger.warn("Booking has no customer email, skipping email notification:", bookingId);
            } else {
              // Fetch vehicle name
              const { data: vehicle } = await supabase
                .from("vehicles")
                .select("year, make, model")
                .eq("id", booking.vehicle_id)
                .single();

              // Check if customer needs a password
              let needsPassword = false;
              if (booking.customer_id) {
                const { data: cust } = await supabase
                  .from("customers")
                  .select("password_hash")
                  .eq("id", booking.customer_id)
                  .single();
                needsPassword = !cust?.password_hash;
              }

              const emailData = {
                bookingId: booking.id,
                customerName: booking.customer_name || "Customer",
                customerEmail: booking.customer_email,
                vehicleName: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Vehicle",
                pickupDate: booking.pickup_date,
                returnDate: booking.return_date,
                pickupTime: booking.pickup_time || undefined,
                returnTime: booking.return_time || undefined,
                totalPrice: booking.total_price,
                deposit: booking.deposit,
                needsPassword,
              };

              // Send confirmation emails (don't await - fire and forget)
              sendBookingConfirmation(emailData)
                .then(() => logger.info("Confirmation email sent via webhook for booking:", bookingId))
                .catch((error) => logger.error("Failed to send confirmation email via webhook:", error));
              sendAdminNewBooking(emailData)
                .then(() => logger.info("Admin confirmation email sent via webhook for booking:", bookingId))
                .catch((error) => logger.error("Failed to send admin confirmation email via webhook:", error));
            }
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;
        if (bookingId) {
          // Mark booking as cancelled if payment expired
          const { error: expireError } = await supabase
            .from("bookings")
            .update({ status: "cancelled" })
            .eq("id", bookingId)
            .eq("status", "pending");

          if (expireError) {
            logger.error("Error cancelling expired booking:", expireError);
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        logger.error(`Payment failed: ${intent.id}`, intent.last_payment_error?.message);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
