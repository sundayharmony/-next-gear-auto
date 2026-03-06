import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServiceSupabase } from "@/lib/db/supabase";
import { sendBookingConfirmation, sendAdminNewBooking } from "@/lib/email/mailer";

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
      pickupTime,
      returnTime,
      extras,
      customerDetails,
      totalPrice,
      deposit,
      signedName,
      promoCode,
      discountAmount,
      insuranceProofUrl,
      insuranceOptedOut,
      idDocumentUrl,
    } = body;

    if (!vehicleId || !pickupDate || !returnDate || !customerDetails?.email) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate dates
    const pickup = new Date(pickupDate);
    const returnDt = new Date(returnDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(pickup.getTime()) || isNaN(returnDt.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid date format" },
        { status: 400 }
      );
    }

    if (pickup < today) {
      return NextResponse.json(
        { success: false, message: "Pickup date must be today or later" },
        { status: 400 }
      );
    }

    if (returnDt <= pickup) {
      return NextResponse.json(
        { success: false, message: "Return date must be after pickup date" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerDetails.email)) {
      return NextResponse.json(
        { success: false, message: "Invalid email address" },
        { status: 400 }
      );
    }

    // Sanitize customer name
    const safeName = (customerDetails.name || "").replace(/<[^>]*>/g, "").trim().slice(0, 100);

    // Double-booking check with 12-hour buffer
    const BUFFER_HOURS = 12;
    const bufferPickup = new Date(pickup);
    bufferPickup.setHours(bufferPickup.getHours() - BUFFER_HOURS);
    const bufferReturn = new Date(returnDt);
    bufferReturn.setHours(bufferReturn.getHours() + BUFFER_HOURS);

    const { data: conflicting } = await supabase
      .from("bookings")
      .select("id, pickup_date, return_date")
      .eq("vehicle_id", vehicleId)
      .in("status", ["confirmed", "active", "pending"])
      .lte("pickup_date", returnDate)
      .gte("return_date", pickupDate);

    if (conflicting && conflicting.length > 0) {
      return NextResponse.json(
        { success: false, message: "This vehicle is already booked for the selected dates. Please choose different dates or another vehicle." },
        { status: 409 }
      );
    }

    // Charge full rental amount upfront
    const chargeAmount = totalPrice || deposit || 0;

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
          name: safeName,
          email: customerDetails.email.toLowerCase().trim(),
          phone: (customerDetails.phone || "").slice(0, 20),
          dob: customerDetails.dob || "",
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
      customer_name: safeName,
      customer_email: customerDetails.email.toLowerCase().trim(),
      customer_phone: (customerDetails.phone || "").slice(0, 20),
      pickup_date: pickupDate,
      return_date: returnDate,
      pickup_time: pickupTime || null,
      return_time: returnTime || null,
      extras: extras || [],
      total_price: totalPrice,
      deposit: chargeAmount,
      status: "pending",
      signed_name: signedName,
      agreement_signed_at: signedName ? new Date().toISOString() : null,
      insurance_proof_url: insuranceProofUrl || null,
      insurance_opted_out: insuranceOptedOut || false,
      id_document_url: idDocumentUrl || null,
    });

    if (bookingError) {
      console.error("Supabase booking error:", bookingError);
      return NextResponse.json(
        { success: false, message: "Failed to create booking" },
        { status: 500 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rentnextgearauto.com";

    // 3. Handle $0 bookings — skip Stripe, auto-confirm, send emails directly
    if (chargeAmount <= 0) {
      await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", bookingId);

      // Check if customer has a password set
      let needsPassword = false;
      if (customerId) {
        const { data: cust } = await supabase
          .from("customers")
          .select("password_hash")
          .eq("id", customerId)
          .single();
        needsPassword = !cust?.password_hash;
      }

      // Send confirmation emails
      const emailData = {
        bookingId,
        customerName: safeName || "Customer",
        customerEmail: customerDetails.email.toLowerCase().trim(),
        vehicleName: vehicleName || "Vehicle",
        pickupDate,
        returnDate,
        pickupTime: pickupTime || undefined,
        returnTime: returnTime || undefined,
        totalPrice: totalPrice || 0,
        deposit: 0,
        needsPassword,
      };

      sendBookingConfirmation(emailData).catch(console.error);
      sendAdminNewBooking(emailData).catch(console.error);

      return NextResponse.json({
        success: true,
        data: {
          sessionId: null,
          sessionUrl: `${siteUrl}/booking/success?booking_id=${bookingId}`,
          bookingId,
          freeBooking: true,
        },
      });
    }

    // 4. Create Stripe Checkout Session for paid bookings
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "cashapp", "link"],
      mode: "payment",
      customer_email: customerDetails.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `NextGearAuto - Vehicle Rental`,
              description: `${vehicleName || "Vehicle"} rental: ${pickupDate}${pickupTime ? " at " + pickupTime : ""} to ${returnDate}${returnTime ? " at " + returnTime : ""}`,
            },
            unit_amount: Math.round(chargeAmount * 100), // Stripe uses cents
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

    // 5. Update booking with Stripe session ID
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
