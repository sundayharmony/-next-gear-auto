import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServiceSupabase } from "@/lib/db/supabase";
import { sendBookingConfirmation, sendBookingPendingEmail, sendAdminNewBooking } from "@/lib/email/mailer";
import { logger } from "@/lib/utils/logger";
import { calculateRentalDays, calculatePricing, applyDiscount } from "@/lib/utils/price-calculator";
import extrasData from "@/data/extras.json";
import type { BookingExtra } from "@/lib/types";

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

    // Double-booking check — allow same-day turnovers with 60-minute gap
    const { data: conflicting } = await supabase
      .from("bookings")
      .select("id, pickup_date, return_date, pickup_time, return_time")
      .eq("vehicle_id", vehicleId)
      .in("status", ["confirmed", "active", "pending"])
      .lte("pickup_date", returnDate)
      .gte("return_date", pickupDate);

    if (conflicting && conflicting.length > 0) {
      const newPickupDt = new Date(`${pickupDate}T${pickupTime || "00:00"}`);
      const newReturnDt = new Date(`${returnDate}T${returnTime || "23:59"}`);

      const hasRealConflict = conflicting.some((existing) => {
        const existPickup = new Date(`${existing.pickup_date}T${existing.pickup_time || "00:00"}`);
        const existReturn = new Date(`${existing.return_date}T${existing.return_time || "23:59"}`);
        const gapAfterExisting = (newPickupDt.getTime() - existReturn.getTime()) / 60000;
        const gapAfterNew = (existPickup.getTime() - newReturnDt.getTime()) / 60000;
        return gapAfterExisting < 60 && gapAfterNew < 60;
      });

      if (hasRealConflict) {
        return NextResponse.json(
          { success: false, message: "This vehicle is already booked for the selected dates. Bookings on the same day must be at least 60 minutes apart." },
          { status: 409 }
        );
      }
    }

    // ── Server-side price recalculation ──────────────────────────────
    // Never trust client-supplied totalPrice. Recalculate from vehicle rate,
    // dates, selected extras, and validated promo code.
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("daily_rate")
      .eq("id", vehicleId)
      .single();

    if (!vehicle) {
      return NextResponse.json(
        { success: false, message: "Vehicle not found" },
        { status: 404 }
      );
    }

    const rentalDays = calculateRentalDays(pickupDate, returnDate);
    const availableExtras = extrasData as BookingExtra[];

    // Map client extras to server-validated extras with correct prices
    const validatedExtras: BookingExtra[] = (extras || []).map((clientExtra: { id: string; selected?: boolean }) => {
      const serverExtra = availableExtras.find((e) => e.id === clientExtra.id);
      if (!serverExtra) return null;
      return { ...serverExtra, selected: clientExtra.selected ?? true };
    }).filter(Boolean) as BookingExtra[];

    let serverPricing = calculatePricing(rentalDays, vehicle.daily_rate, validatedExtras);

    // Apply promo code discount if provided (re-validate server-side)
    if (promoCode && discountAmount && discountAmount > 0) {
      // Look up the promo code to get its actual discount value
      const { data: promo } = await supabase
        .from("promo_codes")
        .select("*")
        .ilike("code", promoCode)
        .eq("is_active", true)
        .single();

      if (promo) {
        const now = new Date().toISOString().split("T")[0];
        const isExpired = promo.expires_at && promo.expires_at < now;
        const isOverLimit = promo.max_uses && promo.used_count >= promo.max_uses;

        if (!isExpired && !isOverLimit) {
          serverPricing = applyDiscount(serverPricing, {
            code: promo.code,
            discountType: promo.discount_type,
            discountValue: promo.discount_value,
            discountAmount: 0, // will be recalculated
            description: promo.description || "",
          });

          // Atomically increment usage: only succeeds if used_count is still
          // below max_uses at the moment of the UPDATE. This prevents two
          // concurrent checkouts from both applying the same last-use code.
          if (promo.max_uses) {
            const { count: updated } = await supabase
              .from("promo_codes")
              .update({ used_count: (promo.used_count ?? 0) + 1 })
              .eq("id", promo.id)
              .lt("used_count", promo.max_uses);

            if (updated === 0) {
              // Race condition: another checkout used the last redemption
              return NextResponse.json(
                { success: false, message: "This promo code has reached its usage limit" },
                { status: 409 }
              );
            }
          } else {
            // No max_uses limit — just increment for tracking
            await supabase
              .from("promo_codes")
              .update({ used_count: (promo.used_count ?? 0) + 1 })
              .eq("id", promo.id);
          }
        }
      }
    }

    const serverTotal = Math.round(serverPricing.total * 100) / 100;

    // Allow small rounding tolerance ($0.02) between client and server
    if (totalPrice != null && Math.abs(totalPrice - serverTotal) > 0.02) {
      logger.warn(`Price mismatch: client=${totalPrice}, server=${serverTotal}, booking for vehicle ${vehicleId}`);
    }

    // Always use server-calculated price
    const chargeAmount = serverTotal;

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
      const newId = "c_" + crypto.randomUUID();
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
    // Use crypto for better collision prevention
    const bookingId = "bk_" + crypto.randomUUID();
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
      total_price: serverTotal,
      deposit: chargeAmount,
      status: "pending",
      signed_name: signedName,
      agreement_signed_at: signedName ? new Date().toISOString() : null,
      insurance_proof_url: insuranceProofUrl || null,
      insurance_opted_out: insuranceOptedOut || false,
      id_document_url: idDocumentUrl || null,
    });

    if (bookingError) {
      logger.error("Supabase booking error:", bookingError);
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
        totalPrice: serverTotal,
        deposit: 0,
        needsPassword,
      };

      sendBookingConfirmation(emailData).catch(logger.error);
      sendAdminNewBooking(emailData).catch(logger.error);

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
            unit_amount: Math.round(Number((chargeAmount || 0).toFixed(2)) * 100) || 1, // Stripe uses cents, min 1 cent
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: bookingId,
        customer_id: customerId || "",
        vehicle_id: vehicleId,
        total_price: serverTotal.toString(),
        promo_code: promoCode || "",
        discount_amount: (discountAmount ?? 0).toString(),
      },
      success_url: `${siteUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
      cancel_url: `${siteUrl}/booking/cancel?booking_id=${bookingId}`,
    });

    // 5. Update booking with Stripe session ID
    await supabase
      .from("bookings")
      .update({ stripe_session_id: session.id })
      .eq("id", bookingId);

    // 6. Send pending payment email to customer and admin
    // Check if customer needs a password for the pending email too
    let needsPasswordForPending = false;
    if (customerId) {
      const { data: custCheck } = await supabase
        .from("customers")
        .select("password_hash")
        .eq("id", customerId)
        .single();
      needsPasswordForPending = !custCheck?.password_hash;
    }

    const emailData = {
      bookingId,
      customerName: safeName || "Customer",
      customerEmail: customerDetails.email.toLowerCase().trim(),
      vehicleName: vehicleName || "Vehicle",
      pickupDate,
      returnDate,
      pickupTime: pickupTime || undefined,
      returnTime: returnTime || undefined,
      totalPrice: serverTotal,
      deposit: chargeAmount,
      needsPassword: needsPasswordForPending,
    };

    // Fire and forget - don't block the response
    sendBookingPendingEmail(emailData).catch((error) => {
      logger.error("Failed to send pending email to customer:", error);
    });
    sendAdminNewBooking(emailData).catch((error) => {
      logger.error("Failed to send admin notification for pending booking:", error);
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        sessionUrl: session.url,
        bookingId,
      },
    });
  } catch (error) {
    logger.error("Checkout error:", error);
    return NextResponse.json(
      { success: false, message: "Checkout failed" },
      { status: 500 }
    );
  }
}
