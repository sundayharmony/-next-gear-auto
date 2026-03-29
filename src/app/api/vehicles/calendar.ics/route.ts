import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";

/**
 * GET /api/vehicles/calendar.ics?vehicleId=...&key=...
 *
 * Exports an iCal (.ics) feed for a specific vehicle's bookings.
 * Import this URL into Turo to block dates when a vehicle is booked on NGA.
 *
 * The `key` param is a simple shared secret (ICAL_EXPORT_KEY env var)
 * to prevent public enumeration of bookings.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vehicleId = searchParams.get("vehicleId");
  const key = searchParams.get("key");

  // Validate params
  if (!vehicleId) {
    return new NextResponse("Missing vehicleId parameter", { status: 400 });
  }

  // Simple API key check — prevents public access to booking data
  const exportKey = process.env.ICAL_EXPORT_KEY;
  if (exportKey && key !== exportKey) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const supabase = getServiceSupabase();

    // Fetch confirmed/active bookings for this vehicle
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("id, pickup_date, return_date, pickup_time, return_time, status, customer_name")
      .eq("vehicle_id", vehicleId)
      .in("status", ["confirmed", "active"])
      .gte("return_date", new Date().toISOString().split("T")[0])
      .order("pickup_date", { ascending: true });

    if (error) {
      logger.error("iCal export error:", error);
      return new NextResponse("Internal Server Error", { status: 500 });
    }

    // Fetch vehicle info for calendar name
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("year, make, model")
      .eq("id", vehicleId)
      .single();

    const vehicleName = vehicle
      ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
      : "Vehicle";

    // Build iCal output
    const now = new Date();
    const stamp = formatICalDateTime(now);
    const domain = process.env.NEXT_PUBLIC_SITE_URL || "rentnextgearauto.com";
    const domainHost = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    let ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      `PRODID:-//NextGearAuto//${vehicleName}//EN`,
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:NGA - ${vehicleName}`,
      `X-WR-TIMEZONE:America/New_York`,
    ].join("\r\n");

    for (const booking of bookings || []) {
      // Use DATE values (all-day events) for simplicity — Turo blocks whole days
      const startDate = booking.pickup_date.replace(/-/g, "");
      // iCal DATE end is exclusive, so add 1 day
      const endDate = addOneDayIcal(booking.return_date);

      ics += "\r\n" + [
        "BEGIN:VEVENT",
        `UID:nga-booking-${booking.id}@${domainHost}`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${startDate}`,
        `DTEND;VALUE=DATE:${endDate}`,
        `SUMMARY:NGA Booking - ${sanitizeICalText(vehicleName)}`,
        `DESCRIPTION:Booked on NextGearAuto (${booking.status})`,
        "STATUS:CONFIRMED",
        "TRANSP:OPAQUE",
        "END:VEVENT",
      ].join("\r\n");
    }

    ics += "\r\nEND:VCALENDAR\r\n";

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${vehicleId}.ics"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    logger.error("iCal export error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/** Format a JS Date as iCal DATETIME (UTC) */
function formatICalDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Add one day to a YYYY-MM-DD string and return as YYYYMMDD */
function addOneDayIcal(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  const iso = d.toISOString().split("T")[0];
  return iso.replace(/-/g, "");
}

/** Sanitize text for iCal (escape special chars) */
function sanitizeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}
