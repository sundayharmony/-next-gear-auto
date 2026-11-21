import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";
import {
  fetchRenterIdentity,
  regenerateSignedAgreementForBooking,
} from "@/lib/agreement/signed-agreement";

/**
 * Driver's license details for a booking's customer.
 *
 * GET  ?bookingId=  -> what is currently saved on the customer profile.
 * POST {bookingId, ...fields} -> staff-confirmed details are saved to the customer profile
 *      (customers.dob and customers.driver_license) and, if the agreement is already signed,
 *      the signed PDF is rebuilt so it prints the confirmed values.
 *
 * Nothing read from a photo or barcode is saved until staff confirm it here.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const STATE = /^[A-Za-z]{2}$/;
const ZIP = /^[A-Za-z0-9 -]{3,10}$/;

function text(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
}

async function resolveCustomerId(
  supabase: ReturnType<typeof getServiceSupabase>,
  booking: { customer_id?: string | null; customer_email?: string | null },
): Promise<string | null> {
  if (booking.customer_id) return booking.customer_id;
  const email = booking.customer_email?.toLowerCase().trim();
  if (!email) return null;
  const { data } = await supabase.from("customers").select("id").ilike("email", email).limit(1).maybeSingle();
  return data?.id ?? null;
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminOrManager(request);
  if (!auth.authorized) return auth.response;

  const bookingId = new URL(request.url).searchParams.get("bookingId");
  if (!bookingId) {
    return NextResponse.json({ success: false, error: "bookingId is required" }, { status: 400 });
  }

  try {
    const supabase = getServiceSupabase();
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, customer_id, customer_email, customer_name, id_document_url, id_document_back_url")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }
    const customerId = await resolveCustomerId(supabase, booking);
    const identity = customerId ? await fetchRenterIdentity(supabase, customerId) : null;
    return NextResponse.json({
      success: true,
      customerId,
      customerName: booking.customer_name ?? null,
      frontUrl: booking.id_document_url ?? null,
      backUrl: booking.id_document_back_url ?? null,
      identity,
    });
  } catch (error) {
    logger.error("License identity load error:", error);
    return NextResponse.json({ success: false, error: "Could not load license details" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminOrManager(request);
  if (!auth.authorized) return auth.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const bookingId = typeof body.bookingId === "string" ? body.bookingId : "";
    if (!bookingId) {
      return NextResponse.json({ success: false, error: "bookingId is required" }, { status: 400 });
    }

    const dob = text(body.dob, 10);
    if (dob && !ISO_DATE.test(dob)) {
      return NextResponse.json({ success: false, error: "Date of birth must be YYYY-MM-DD" }, { status: 400 });
    }
    const expires = text(body.expires, 10);
    if (expires && !ISO_DATE.test(expires)) {
      return NextResponse.json({ success: false, error: "Expiration must be YYYY-MM-DD" }, { status: 400 });
    }
    const licenseState = text(body.licenseState, 2);
    const state = text(body.state, 2);
    if ((licenseState && !STATE.test(licenseState)) || (state && !STATE.test(state))) {
      return NextResponse.json({ success: false, error: "State must be a two-letter code" }, { status: 400 });
    }
    const zip = text(body.zip, 10);
    if (zip && !ZIP.test(zip)) {
      return NextResponse.json({ success: false, error: "ZIP code looks invalid" }, { status: 400 });
    }
    const licenseNumber = text(body.licenseNumber, 30);
    if (!licenseNumber && !dob) {
      return NextResponse.json(
        { success: false, error: "Enter at least a license number or date of birth" },
        { status: 400 },
      );
    }

    const supabase = getServiceSupabase();
    const { data: booking } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
    if (!booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }
    const customerId = await resolveCustomerId(supabase, booking);
    if (!customerId) {
      return NextResponse.json(
        { success: false, error: "This booking has no customer profile to save the license to" },
        { status: 400 },
      );
    }

    // Keep any other keys already stored in driver_license.
    const { data: existing } = await supabase
      .from("customers")
      .select("driver_license")
      .eq("id", customerId)
      .maybeSingle();
    const previous =
      existing?.driver_license && typeof existing.driver_license === "object"
        ? (existing.driver_license as Record<string, unknown>)
        : {};

    const driverLicense = {
      ...previous,
      number: licenseNumber,
      state: licenseState?.toUpperCase() ?? null,
      expires,
      address: {
        line1: text(body.addressLine, 120),
        city: text(body.city, 60),
        state: state?.toUpperCase() ?? null,
        zip,
      },
      confirmed_at: new Date().toISOString(),
      confirmed_by: auth.userId,
    };

    const update: Record<string, unknown> = { driver_license: driverLicense };
    if (dob) update.dob = dob;
    const { error: updateError } = await supabase.from("customers").update(update).eq("id", customerId);
    if (updateError) {
      logger.error("License identity save error:", updateError);
      return NextResponse.json({ success: false, error: "Could not save to the customer profile" }, { status: 500 });
    }

    // Activity log records which fields were confirmed, never the values themselves.
    await supabase.from("booking_activity").insert({
      booking_id: bookingId,
      action: "license_confirmed",
      details: {
        by: auth.userId,
        fields: Object.entries({
          dob,
          license_number: licenseNumber,
          license_state: licenseState,
          expires,
          address: text(body.addressLine, 120),
        })
          .filter(([, v]) => Boolean(v))
          .map(([k]) => k),
      },
    });

    let agreementUpdated = false;
    if (booking.rental_agreement_url) {
      try {
        agreementUpdated = await regenerateSignedAgreementForBooking(supabase, booking);
      } catch (err) {
        logger.error("Agreement regeneration after license confirm failed:", err);
      }
    }

    return NextResponse.json({ success: true, agreementUpdated });
  } catch (error) {
    logger.error("License identity POST error:", error);
    return NextResponse.json({ success: false, error: "Could not save license details" }, { status: 500 });
  }
}
