import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { sendAgreementEmail } from "@/lib/email/mailer";
import { logger } from "@/lib/utils/logger";
import {
  buildSignedAgreementPdfBytes,
  uploadSignedAgreementPdf,
  vehicleNameForAgreement,
} from "@/lib/agreement/signed-agreement";

interface SignatureData {
  t35?: string; // Renter Initials (Page 1)
  t42?: string; // GPS Initials (Page 2)
  t43?: string; // Renter Initials (Page 2)
  t47?: string; // Renter Signature (Page 3)
  t51?: string; // Additional Driver Signature (Page 3)
  t55?: string; // NGA Rep Signature (Page 3)
  t57?: string; // Renter Initials (Page 3)
}

export async function POST(req: NextRequest) {
  const supabase = getServiceSupabase();

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON" },
        { status: 400 }
      );
    }
    const { bookingId, signatures, customerEmail } = body as {
      bookingId: string;
      signatures: SignatureData;
      customerEmail?: string;
    };

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "bookingId is required" },
        { status: 400 }
      );
    }

    if (!signatures || Object.keys(signatures).length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one signature is required" },
        { status: 400 }
      );
    }

    // Validate signature data format — each value must be a valid base64 PNG
    // PNG magic number: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
    const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    for (const [key, value] of Object.entries(signatures)) {
      if (value && typeof value === "string") {
        const cleaned = (value as string).replace(/^data:image\/png;base64,/, "");
        // Check base64 length - limit to 500KB to prevent DoS
        if (cleaned.length > 500 * 1024) {
          return NextResponse.json(
            { success: false, error: `Signature ${key} exceeds maximum size (500KB limit)` },
            { status: 400 }
          );
        }
        try {
          const imgBuffer = Buffer.from(cleaned, "base64");
          // Verify PNG magic number
          if (imgBuffer.length < 8 || !imgBuffer.subarray(0, 8).equals(PNG_MAGIC)) {
            return NextResponse.json(
              { success: false, error: `Signature ${key} is not a valid PNG image` },
              { status: 400 }
            );
          }
        } catch {
          return NextResponse.json(
            { success: false, error: `Invalid signature data for ${key}` },
            { status: 400 }
          );
        }
      }
    }

    // Fetch booking to verify it exists
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingErr || !booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Verify the requester owns this booking (check customer email matches)
    if (!customerEmail) {
      return NextResponse.json(
        { success: false, error: "Customer email is required to sign this agreement" },
        { status: 400 }
      );
    }
    // Check for null customer_email before comparison (Bug 20)
    if (!booking.customer_email) {
      return NextResponse.json(
        { success: false, error: "Booking has no customer email" },
        { status: 400 }
      );
    }
    if (customerEmail.toLowerCase().trim() !== booking.customer_email.toLowerCase().trim()) {
      logger.warn(`Agreement sign attempt by non-owner: ${customerEmail} for booking ${bookingId}`);
      return NextResponse.json(
        { success: false, error: "You are not authorized to sign this agreement" },
        { status: 403 }
      );
    }

    // Verify booking hasn't already been signed
    if (booking.agreement_signed_at) {
      return NextResponse.json(
        { success: false, error: "This agreement has already been signed" },
        { status: 409 }
      );
    }

    // Verify booking is in a valid state for signing (not cancelled or completed)
    const validStatuses = ["pending", "confirmed", "active"];
    if (!booking.status || !validStatuses.includes(booking.status)) {
      return NextResponse.json(
        { success: false, error: "This booking is not in a valid state for signing" },
        { status: 400 }
      );
    }

    // Fetch vehicle info
    let vehicle: {
      make?: string;
      model?: string;
      year?: number;
      license_plate?: string;
      vin?: string;
      color?: string;
      mileage?: number;
    } | null = null;
    if (booking.vehicle_id) {
      const { data: v } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", booking.vehicle_id)
        .maybeSingle();
      vehicle = v;
    }

    const now = new Date();
    const signedAtIso = now.toISOString();
    const signedPdfBytes = await buildSignedAgreementPdfBytes(booking, vehicle, signatures, signedAtIso);
    const agreementUrl = await uploadSignedAgreementPdf(supabase, bookingId, signedPdfBytes);

    // Update booking with agreement URL and signed status using atomic conditional update
    const { data: updateResult, error: updateError } = await supabase
      .from("bookings")
      .update({
        rental_agreement_url: agreementUrl,
        agreement_signed_at: signedAtIso,
        signed_name: booking.customer_name,
      })
      .eq("id", bookingId)
      .is("agreement_signed_at", null)
      .select("id")
      .maybeSingle();

    if (updateError || !updateResult) {
      return NextResponse.json(
        { success: false, error: "This agreement was already signed by another request" },
        { status: 409 }
      );
    }

    await supabase.from("booking_activity").insert({
      booking_id: bookingId,
      action: "agreement_signed",
      details: {
        signatures,
        signed_at: signedAtIso,
      },
      performed_by: booking.customer_email || customerEmail,
    });

    // Email the signed agreement to the customer
    if (booking.customer_email) {
      const vehicleName = await vehicleNameForAgreement(supabase, booking.vehicle_id);

      sendAgreementEmail({
        bookingId: booking.id,
        customerName: booking.customer_name || "Customer",
        customerEmail: booking.customer_email,
        vehicleName,
        pickupDate: booking.pickup_date,
        returnDate: booking.return_date,
        pickupTime: booking.pickup_time || undefined,
        returnTime: booking.return_time || undefined,
        totalPrice: booking.total_price ?? 0,
        deposit: booking.deposit ?? 0,
        pdfBytes: signedPdfBytes,
      }).catch(logger.error);
    }

    return NextResponse.json({
      success: true,
      data: {
        url: agreementUrl,
        signedAt: signedAtIso,
      },
    });
  } catch (error) {
    logger.error("Rental agreement sign error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sign agreement" },
      { status: 500 }
    );
  }
}
