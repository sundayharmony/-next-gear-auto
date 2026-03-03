import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServiceSupabase } from "@/lib/db/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const supabase = getServiceSupabase();
  try {
    const body = await request.json();
    const {
      vehicleId,
      vehicleName,
      pickupDate,
      returnDate,
      extras,
      customerDetails,
      totalPrice,
      deposit,
      signedName,
      promoCode,
      discountAmount,
    } = body;

    if (!vehicleId || !pickupDate || !returnDate || !customerDetails?.email) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const depositAmount = deposit || 50;

    // 1. Find or create customer in Supabase
    let customerId: string | null = null;
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("email", customerDetails.email)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const newId = "c" + Date.now();
      const { data: newCustomer } = await supabase
        .from("customers")
        .insert({
          id: newId,
          name: customerDetails.name,
          email: customerDetails.email,
          phone: customerDetails.phone,
          dob: customerDetails.dob,
          role: "customer",
        })
        .select("id")
        .single();
      customerId = newCustomer?.id || newId;
    }

    // 2. Create booking in Supabase (status: pending)
    const bookingId = "bk" + Date.now() + Math.floor(Math.random() * 1000);
    const { error: bookingError } = await supabase.from("bookings").insert({
      id: bookingId,
      customer_id: customerId,
      vehicle_id: vehicleId,
      customer_name: customerDetails.name,
      customer_email: customerDetails.email,
      customer_phone: customerDetails.phone,
      pickup_date: pickupDate,
      return_date: returnDate,
      extras: extras || [],
      total_price: totalPrice,
      deposit: depositAmount,
      status: "pending",
      signed_name: signedName,
      agreement_signed_at: signedName ? new Date().toISOString() : null,
    });

    if (bookingError) {
      console.error("Supabase booking error:", bookingError);
      return NextResponse.json(
        { success: false, message: "Failed to create booking" },
        { status: 500 }
      );
    }

    // 3. Create Stripe Checkout Session
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rentnextgearauto.com";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "cashapp", "link"],
      mode: "payment",
      customer_email: customerDetails.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `NextGearAuto - Booking Deposit`,
              description: `${vehicleName || "Vehicle"} rental: ${pickupDate} to ${returnDate}`,
            },
            unit_amount: Math.round(depositAmount * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: bookingId,
        customer_id: customerId || "",
        vehicle_id: vehicleId,
        total_price: totalPrice.toString(),
        promo_code: promoCode || "",
        discount_amount: (discountAmount || 0).toString(),
      },
      success_url: `${siteUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
      cancel_url: `${siteUrl}/booking/cancel?booking_id=${bookingId}`,
    });

    // 4. Update booking with Stripe session ID
    await supabase
      .from("bookings")
      .update({ stripe_session_id: session.id })
      .eq("id", bookingId);

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        sessionUrl: session.url,
        bookingId,
      },
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { success: false, message: "Checkout failed" },
      { status: 500 }
    );
  }
}
