import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServiceSupabase } from "@/lib/db/supabase";
import { sendBookingConfirmation, sendAdminNewBooking } from "@/lib/email/mailer";

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
    } else {
      // In development or if webhook secret not set, parse directly
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;

        if (bookingId) {
          // Update booking status to confirmed
          await supabase
            .from("bookings")
            .update({
              status: "confirmed",
              stripe_payment_intent: session.payment_intent as string,
            })
            .eq("id", bookingId);

          // Create payment record
          await supabase.from("payment_records").insert({
            id: "pay" + Date.now(),
            booking_id: bookingId,
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent as string,
            amount: (session.amount_total || 0) / 100,
            status: "succeeded",
          });

          // Fetch booking details for email
          const { data: booking } = await supabase
            .from("bookings")
            .select("*")
            .eq("id", bookingId)
            .single();

          if (booking) {
            // Fetch vehicle name
            const { data: vehicle } = await supabase
              .from("vehicles")
              .select("year, make, model")
              .eq("id", booking.vehicle_id)
              .single();

            const emailData = {
              bookingId: booking.id,
              customerName: booking.customer_name || "Customer",
              customerEmail: booking.customer_email || "",
              vehicleName: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Vehicle",
              pickupDate: booking.pickup_date,
              returnDate: booking.return_date,
              totalPrice: booking.total_price,
              deposit: booking.deposit,
            };

            // Send confirmation emails (don't await - fire and forget)
            sendBookingConfirmation(emailData).catch(console.error);
            sendAdminNewBooking(emailData).catch(console.error);
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;
        if (bookingId) {
          // Mark booking as cancelled if payment expired
          await supabase
            .from("bookings")
            .update({ status: "cancelled" })
            .eq("id", bookingId)
            .eq("status", "pending");
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        console.error("Payment failed:", intent.id, intent.last_payment_error?.message);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
