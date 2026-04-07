import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServiceSupabase } from "@/lib/db/supabase";
import { sendBookingConfirmation, sendAdminNewBooking } from "@/lib/email/mailer";
import { logger } from "@/lib/utils/logger";
import { getVehicleDisplayName } from "@/lib/types";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const supabase = getServiceSupabase();
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  // If webhook secret is configured, verify signature
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;

  try {
    // Fail-closed: reject ALL webhook requests if secret is not properly configured
    if (!webhookSecret || webhookSecret.includes("REPLACE")) {
      logger.error("SECURITY: Webhook secret not configured - rejecting request");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }
    if (!sig) {
      logger.error("SECURITY: Missing webhook signature - rejecting request");
      return NextResponse.json({ error: "Webhook signature missing" }, { status: 400 });
    }
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret!);
  } catch (err) {
    logger.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    // Idempotency is checked per-event-type below using session.id (not event.id).
    // event.id is the webhook event ID, but payment_records are keyed by session.id.

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;

        if (bookingId) {
          // Idempotency: skip if this session was already processed
          const { data: alreadyProcessed } = await supabase
            .from("payment_records")
            .select("id")
            .eq("stripe_session_id", session.id)
            .maybeSingle();

          if (alreadyProcessed) {
            logger.info(`Webhook duplicate skipped for session: ${session.id}`);
            return NextResponse.json({ received: true });
          }

          // Atomically confirm booking — only update if not already confirmed.
          // The .neq("status", "confirmed") guard makes this idempotent even under
          // concurrent webhook deliveries without a separate read-then-write.
          const { error: updateError } = await supabase
            .from("bookings")
            .update({
              status: "confirmed",
              stripe_payment_intent: session.payment_intent as string,
            })
            .eq("id", bookingId)
            .neq("status", "confirmed");

          if (updateError) {
            logger.error("Error updating booking status:", updateError);
          }

          // Create payment record (use crypto.randomUUID to avoid ID collisions in serverless).
          // Upsert on stripe_session_id prevents duplicate records from concurrent webhook deliveries.
          const { error: paymentError } = await supabase.from("payment_records").upsert(
            {
              id: "pay_" + crypto.randomUUID(),
              booking_id: bookingId,
              stripe_session_id: session.id,
              stripe_payment_intent: session.payment_intent as string,
              amount: (session.amount_total ?? 0) / 100,
              status: "succeeded",
            },
            { onConflict: "stripe_session_id", ignoreDuplicates: true }
          );

          if (paymentError) {
            logger.error("Error creating payment record:", paymentError);
          }

          // Fetch booking details for email
          const { data: booking } = await supabase
            .from("bookings")
            .select("*")
            .eq("id", bookingId)
            .maybeSingle();

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
                .maybeSingle();

              // Check if customer needs a password
              let needsPassword = false;
              if (booking.customer_id) {
                const { data: cust } = await supabase
                  .from("customers")
                  .select("password_hash")
                  .eq("id", booking.customer_id)
                  .maybeSingle();
                needsPassword = !cust?.password_hash;
              }

              const emailData = {
                bookingId: booking.id,
                customerName: booking.customer_name || "Customer",
                customerEmail: booking.customer_email,
                vehicleName: vehicle ? getVehicleDisplayName(vehicle) : "Vehicle",
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
