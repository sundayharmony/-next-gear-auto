import { NextRequest, NextResponse } from "next/server";
import { buildAgreementPdf, type AgreementPdfBooking } from "@/lib/agreement/agreement-pdf";
import { buildAgreementBookingContext, type AgreementBookingRow } from "@/lib/agreement/agreement-booking-context";
import { fetchRenterIdentity } from "@/lib/agreement/signed-agreement";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";
import { validateAgreementAccessToken } from "@/lib/agreement/agreement-access-token";

// GET: Generate a pre-filled rental agreement PDF
// Supports two modes:
//   1. ?bookingId=xxx — fetches data from an existing booking
//   2. ?vehicleId=xxx&pickupDate=...&returnDate=...&customerName=... — for pre-booking preview
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("bookingId");
  const vehicleId = searchParams.get("vehicleId");

  if (!bookingId && !vehicleId) {
    return NextResponse.json(
      { success: false, error: "bookingId or vehicleId is required" },
      { status: 400 }
    );
  }

  const supabase = getServiceSupabase();

  try {
    // For preview mode, require admin auth
    if (!bookingId && vehicleId) {
      const { verifyAdmin } = await import("@/lib/auth/admin-check");
      const auth = await verifyAdmin(req);
      if (!auth.authorized) return auth.response;
    }

    let booking: {
      customer_name?: string;
      customer_email?: string;
      customer_phone?: string;
      pickup_date: string;
      return_date: string;
      pickup_time?: string | null;
      return_time?: string | null;
      total_price: number;
      deposit: number;
      vehicle_id?: string;
      admin_notes?: string | null;
    } | null = null;
    let vehicle: {
      make?: string;
      model?: string;
      year?: number;
      license_plate?: string;
      vin?: string;
      color?: string;
      mileage?: number;
    } | null = null;

    if (bookingId) {
      // Mode 1: Existing booking
      const { data: b, error: bookingErr } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .maybeSingle();

      if (bookingErr || !b) {
        return NextResponse.json(
          { success: false, error: "Booking not found" },
          { status: 404 }
        );
      }
      booking = b;

      const accessToken = searchParams.get("token");
      if (accessToken) {
        const claims = validateAgreementAccessToken(accessToken);
        if (!claims || claims.bookingId !== bookingId) {
          return NextResponse.json(
            { success: false, error: "Invalid or expired agreement access token" },
            { status: 403 }
          );
        }
        if (
          claims.email &&
          b.customer_email &&
          claims.email !== b.customer_email.toLowerCase().trim()
        ) {
          return NextResponse.json(
            { success: false, error: "Not authorized to view this agreement" },
            { status: 403 }
          );
        }
      } else {
        const { verifyAdminOrManager } = await import("@/lib/auth/admin-check");
        const staffAuth = await verifyAdminOrManager(req);
        if (staffAuth.authorized) {
          // staff may generate for any booking
        } else if (!b.customer_email) {
          return NextResponse.json(
            {
              success: false,
              error: "Signed access token or staff authorization required for this booking",
            },
            { status: 403 }
          );
        } else {
          const requesterEmail = searchParams.get("email")?.toLowerCase().trim();
          if (!requesterEmail || requesterEmail !== b.customer_email.toLowerCase().trim()) {
            return NextResponse.json(
              { success: false, error: "Not authorized to view this agreement" },
              { status: 403 }
            );
          }
        }
      }

      if (booking && booking.vehicle_id) {
        const { data: v } = await supabase
          .from("vehicles")
          .select("*")
          .eq("id", booking.vehicle_id)
          .maybeSingle();

        if (!v) {
          return NextResponse.json(
            { success: false, error: "Vehicle not found" },
            { status: 404 }
          );
        }
        vehicle = v;
      }
    } else {
      // Mode 2: Pre-booking preview with query params
      if (vehicleId) {
        const { data: v } = await supabase
          .from("vehicles")
          .select("*")
          .eq("id", vehicleId)
          .maybeSingle();
        vehicle = v;
      }

      // Build a mock booking object from query params
      const pickupDate = searchParams.get("pickupDate") || "";
      const returnDate = searchParams.get("returnDate") || "";

      // Validate date format (Bug 27)
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (pickupDate && !isoDateRegex.test(pickupDate)) {
        return NextResponse.json(
          { success: false, error: "Invalid pickup_date format. Must be ISO date (YYYY-MM-DD)" },
          { status: 400 }
        );
      }
      if (returnDate && !isoDateRegex.test(returnDate)) {
        return NextResponse.json(
          { success: false, error: "Invalid return_date format. Must be ISO date (YYYY-MM-DD)" },
          { status: 400 }
        );
      }

      booking = {
        customer_name: searchParams.get("customerName") || "",
        customer_email: searchParams.get("customerEmail") || "",
        customer_phone: searchParams.get("customerPhone") || "",
        pickup_date: pickupDate,
        return_date: returnDate,
        pickup_time: searchParams.get("pickupTime") || null,
        return_time: searchParams.get("returnTime") || null,
        total_price: Number.isFinite(parseFloat(searchParams.get("totalPrice") || "0")) ? parseFloat(searchParams.get("totalPrice") || "0") : 0,
        deposit: Number.isFinite(parseFloat(searchParams.get("deposit") || "0")) ? parseFloat(searchParams.get("deposit") || "0") : 0,
        vehicle_id: vehicleId || "",
      };
    }

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking data could not be resolved" },
        { status: 400 }
      );
    }

    // Renter identity (date of birth, address, license) comes from the customer record.
    const customerId = (booking as { customer_id?: string | null }).customer_id;
    const renter = await fetchRenterIdentity(supabase, customerId);

    // Unsigned copy: the same builder the signed agreement uses, without signatures.
    const pdfBytes = await buildAgreementPdf({
      booking: booking as AgreementPdfBooking & { id?: string },
      vehicle,
      renter,
      context: buildAgreementBookingContext(booking as AgreementBookingRow),
      signatures: {},
      signedAtIso: null,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="rental-agreement.pdf"`,
      },
    });
  } catch (error) {
    logger.error("Rental agreement generate error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate agreement" },
      { status: 500 }
    );
  }
}
