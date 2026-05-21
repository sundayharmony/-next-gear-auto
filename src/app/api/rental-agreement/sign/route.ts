import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";
import {
  AgreementSigningError,
  completeAgreementSigning,
  validateAgreementSignatures,
} from "@/lib/agreement/complete-agreement-signing";

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON" },
        { status: 400 },
      );
    }

    const { bookingId, signatures, customerEmail } = body as {
      bookingId?: string;
      signatures?: Record<string, unknown>;
      customerEmail?: string;
    };

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "bookingId is required" },
        { status: 400 },
      );
    }

    try {
      validateAgreementSignatures(signatures);
    } catch (err) {
      if (err instanceof AgreementSigningError) {
        return NextResponse.json({ success: false, error: err.message }, { status: err.status });
      }
      throw err;
    }

    const supabase = getServiceSupabase();
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("customer_email, agreement_signed_at")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingErr) {
      logger.error("Rental agreement sign booking lookup error:", bookingErr);
      return NextResponse.json(
        { success: false, error: "Unable to load booking" },
        { status: 500 },
      );
    }

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 },
      );
    }

    if (!customerEmail) {
      return NextResponse.json(
        { success: false, error: "Customer email is required to sign this agreement" },
        { status: 400 },
      );
    }
    if (!booking.customer_email) {
      return NextResponse.json(
        { success: false, error: "Booking has no customer email" },
        { status: 400 },
      );
    }
    if (customerEmail.toLowerCase().trim() !== booking.customer_email.toLowerCase().trim()) {
      logger.warn(`Agreement sign attempt by non-owner: ${customerEmail} for booking ${bookingId}`);
      return NextResponse.json(
        { success: false, error: "You are not authorized to sign this agreement" },
        { status: 403 },
      );
    }

    const result = await completeAgreementSigning(bookingId, signatures!, {
      performedBy: booking.customer_email || customerEmail,
      channel: "customer",
    });

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
        signedAt: result.signedAt,
      },
    });
  } catch (error) {
    if (error instanceof AgreementSigningError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    logger.error("Rental agreement sign error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sign agreement" },
      { status: 500 },
    );
  }
}
