import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServiceSupabase } from "@/lib/db/supabase";
import { sendBookingConfirmationWithAgreement, sendAdminNewBooking } from "@/lib/email/mailer";
import { logger } from "@/lib/utils/logger";
import { sumBookingPaymentAmounts } from "@/lib/bookings/payments";
import { getVehicleDisplayName } from "@/lib/types";
import { redeemBookingPromo } from "@/lib/promo-codes/promo-integrity";

function getStripe(): Stripe {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(stripeKey);
}

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
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret!);
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
        const isBalancePayment =
          session.metadata?.purpose === "invoice" ||
          session.metadata?.extension === "true";

        if (bookingId) {
          // Idempotency: skip if this session was already processed
          const { data: alreadyProcessed } = await supabase
            .from("payment_records")
            .select("id")
            .eq("stripe_session_id", session.id)
            .maybeSingle();

          if (alreadyProcessed) {
            if (!isBalancePayment) {
              try {
                await redeemBookingPromo(supabase, bookingId);
              } catch (error) {
                logger.error("Error retrying promo redemption:", error);
                return NextResponse.json(
                  { error: "Promo redemption failed" },
                  { status: 500 },
                );
              }
            }
            logger.info(`Webhook duplicate skipped for session: ${session.id}`);
            return NextResponse.json({ received: true });
          }

          const amountPaid = Math.round((session.amount_total ?? 0)) / 100;
          const stripeNote = `stripe_session:${session.id}`;

          // Mirror Stripe payment in booking_payments so admin Record Payment sums stay correct.
          const { data: existingBp } = await supabase
            .from("booking_payments")
            .select("id")
            .eq("booking_id", bookingId)
            .eq("note", stripeNote)
            .maybeSingle();

          if (!existingBp && amountPaid > 0) {
            const { error: bpError } = await supabase.from("booking_payments").insert({
              booking_id: bookingId,
              amount: amountPaid,
              method: "stripe",
              note: stripeNote,
            });
            if (bpError) {
              logger.error("Error creating booking_payments row for Stripe:", bpError);
            }
          }

          const { data: allPayments } = await supabase
            .from("booking_payments")
            .select("amount")
            .eq("booking_id", bookingId);
          const depositTotal = sumBookingPaymentAmounts(allPayments || []);

          // Always sync paid total onto the booking (invoice/extension balances included).
          const { error: depositSyncError } = await supabase
            .from("bookings")
            .update({
              deposit: depositTotal,
              ...(session.payment_intent
                ? { stripe_payment_intent: session.payment_intent as string }
                : {}),
            })
            .eq("id", bookingId);

          if (depositSyncError) {
            logger.error("Error syncing booking deposit after Stripe payment:", depositSyncError);
            return NextResponse.json(
              { error: "Booking payment sync failed" },
              { status: 500 },
            );
          }

          if (!isBalancePayment) {
            // Atomically confirm booking — only update if still pending.
            const { error: updateError } = await supabase
              .from("bookings")
              .update({
                status: "confirmed",
              })
              .eq("id", bookingId)
              .eq("status", "pending");

            if (updateError) {
              logger.error("Error updating booking status:", updateError);
              return NextResponse.json(
                { error: "Booking confirmation failed" },
                { status: 500 },
              );
            }

            try {
              await redeemBookingPromo(supabase, bookingId);
            } catch (error) {
              logger.error("Error recording promo redemption:", error);
              return NextResponse.json(
                { error: "Promo redemption failed" },
                { status: 500 },
              );
            }
          }

          const { error: paymentError } = await supabase.from("payment_records").upsert(
            {
              id: "pay_" + crypto.randomUUID(),
              booking_id: bookingId,
              stripe_session_id: session.id,
              stripe_payment_intent: session.payment_intent as string,
              amount: amountPaid,
              status: "succeeded",
            },
            { onConflict: "stripe_session_id", ignoreDuplicates: true }
          );

          if (paymentError) {
            logger.error("Error creating payment record:", paymentError);
          }

          if (session.metadata?.purpose === "invoice") {
            await supabase.from("booking_activity").insert({
              booking_id: bookingId,
              action: "invoice_paid_stripe",
              details: {
                invoice_id: session.metadata.invoice_id || null,
                stripe_session_id: session.id,
                amount: amountPaid,
              },
              performed_by: "stripe_webhook",
            });
          }

          // Initial checkout only — do not re-send booking confirmation for invoice/extension pays.
          if (!isBalancePayment) {
            const { data: booking } = await supabase
              .from("bookings")
              .select("*")
              .eq("id", bookingId)
              .maybeSingle();

            if (booking) {
              if (!booking.customer_email) {
                logger.warn("Booking has no customer email, skipping email notification:", bookingId);
              } else {
                const { data: vehicle } = await supabase
                  .from("vehicles")
                  .select("year, make, model")
                  .eq("id", booking.vehicle_id)
                  .maybeSingle();

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

                sendBookingConfirmationWithAgreement(emailData)
                  .then(() => logger.info("Confirmation email sent via webhook for booking:", bookingId))
                  .catch((error) => logger.error("Failed to send confirmation email via webhook:", error));
                sendAdminNewBooking(emailData)
                  .then(() => logger.info("Admin confirmation email sent via webhook for booking:", bookingId))
                  .catch((error) => logger.error("Failed to send admin confirmation email via webhook:", error));
              }
            }
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;
        const isBalancePayment =
          session.metadata?.purpose === "invoice" ||
          session.metadata?.extension === "true";
        // Only cancel unpaid initial checkout — never cancel for invoice/extension links.
        if (bookingId && !isBalancePayment) {
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
