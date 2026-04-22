import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";

function buildInitials(name: string | null | undefined): string {
  const words = (name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "NA";
  const initials = words.slice(0, 3).map((w) => w[0]?.toUpperCase() || "").join("");
  return initials || "NA";
}

function parseTripStart(pickupDate: string, pickupTime: string | null): Date {
  const time = typeof pickupTime === "string" && /^\d{2}:\d{2}$/.test(pickupTime) ? pickupTime : "00:00";
  return new Date(`${pickupDate}T${time}:00`);
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const bookingId = typeof body?.bookingId === "string" ? body.bookingId : "";

    if (!bookingId) {
      return NextResponse.json({ success: false, message: "bookingId is required" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, customer_name, pickup_date, pickup_time, agreement_signed_at, signed_name")
      .eq("id", bookingId)
      .maybeSingle();

    if (fetchError || !booking) {
      return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
    }

    if (booking.agreement_signed_at) {
      return NextResponse.json(
        { success: false, message: "This booking is already signed." },
        { status: 409 },
      );
    }

    const tripStart = parseTripStart(booking.pickup_date, booking.pickup_time);
    const now = new Date();
    if (now < tripStart) {
      return NextResponse.json(
        { success: false, message: "Override is only allowed on or after the trip start time." },
        { status: 400 },
      );
    }

    const initials = buildInitials(booking.customer_name);
    const signedName = `${initials} (override)`;
    const signedAt = now.toISOString();

    const { data: updated, error: updateError } = await supabase
      .from("bookings")
      .update({
        signed_name: signedName,
        agreement_signed_at: signedAt,
      })
      .eq("id", bookingId)
      .is("agreement_signed_at", null)
      .select("id, signed_name, agreement_signed_at")
      .maybeSingle();

    if (updateError || !updated) {
      return NextResponse.json(
        { success: false, message: "This booking was signed by another action. Refresh and try again." },
        { status: 409 },
      );
    }

    await supabase.from("booking_activity").insert({
      booking_id: bookingId,
      action: "agreement_override_signed",
      details: {
        initials,
        trip_start: tripStart.toISOString(),
      },
      performed_by: auth.adminId,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Agreement override applied with initials ${initials}.`,
    });
  } catch (error) {
    logger.error("Override signature failed:", error);
    return NextResponse.json({ success: false, message: "Failed to apply override signature" }, { status: 500 });
  }
}

