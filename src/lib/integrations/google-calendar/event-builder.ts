import type { calendar_v3 } from "googleapis";
import { displayBlockedDateLocation } from "@/app/admin/blocked-dates/blocked-dates-types";
import { getVehicleDisplayName } from "@/lib/types";
import { isBlockedDateCancelled, isTuroBlockedSource, TURO_BLOCKED_SOURCE } from "@/lib/utils/blocked-dates";
import { getTuroDriverFromReason, isTuroTripSyncMutable } from "@/lib/utils/turo-blocked-date";
import { getBusinessTodayYyyyMmDd } from "@/lib/utils/booking-dates";
import { getBookingOccupancyEndDate } from "@/lib/utils/recurring-booking";
import { hashSyncPayload } from "./crypto";
import {
  type BuiltGoogleCalendarEvent,
  GCAL_BUSINESS_TIMEZONE,
  type GoogleCalendarSourceKind,
} from "./types";

export type BookingCalendarInput = {
  id: string;
  vehicle_id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  pickup_date: string;
  return_date: string;
  pickup_time: string | null;
  return_time: string | null;
  pickup_location_name: string | null;
  return_location_name: string | null;
  pickup_location_id: string | null;
  status: string;
  total_price: number | string | null;
  admin_notes?: string | null;
};

export type LocationLookup = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

export type BlockedDateCalendarInput = {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  pickup_time: string | null;
  return_time: string | null;
  location: string | null;
  reason: string | null;
  source: string;
  earnings?: number | string | null;
  cancelled_at?: string | null;
};

export type VehicleLookup = {
  id: string;
  year: number | string;
  make: string;
  model: string;
};

function normalizeDate(value: string | null | undefined): string {
  return (value || "").split("T")[0];
}

function normalizeTime(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const parts = value.split(":");
  const h = parts[0]?.padStart(2, "0") ?? "00";
  const m = parts[1]?.padStart(2, "0") ?? "00";
  return `${h}:${m}`;
}

function dateTimePayload(date: string, time: string): { dateTime: string; timeZone: string } {
  return {
    dateTime: `${date}T${time}:00`,
    timeZone: GCAL_BUSINESS_TIMEZONE,
  };
}

export function formatLocationAddress(loc: LocationLookup): string {
  const parts = [loc.address, loc.city, loc.state, loc.zip].filter(Boolean);
  if (parts.length) return parts.join(", ");
  return loc.name;
}

export function resolveBookingLocation(
  booking: BookingCalendarInput,
  locationsById: Map<string, LocationLookup>
): string | null {
  const name = booking.pickup_location_name?.trim();
  if (name) return name;
  if (booking.pickup_location_id) {
    const loc = locationsById.get(booking.pickup_location_id);
    if (loc) return formatLocationAddress(loc);
  }
  return null;
}

function vehicleLabel(vehicle: VehicleLookup | undefined, vehicleId: string): string {
  return vehicle ? getVehicleDisplayName(vehicle) : vehicleId;
}

export function buildBookingCalendarEvent(
  booking: BookingCalendarInput,
  vehicle: VehicleLookup | undefined,
  locationsById: Map<string, LocationLookup>,
  todayYmd = getBusinessTodayYyyyMmDd(GCAL_BUSINESS_TIMEZONE)
): BuiltGoogleCalendarEvent {
  const shouldDelete = booking.status === "cancelled" || booking.status === "no-show";
  const pickupDate = normalizeDate(booking.pickup_date);
  const returnDate = getBookingOccupancyEndDate(
    {
      pickup_date: booking.pickup_date,
      return_date: booking.return_date,
      admin_notes: booking.admin_notes,
      status: booking.status,
    },
    todayYmd
  );
  const location = resolveBookingLocation(booking, locationsById);
  const vehicleName = vehicleLabel(vehicle, booking.vehicle_id);
  const customer = booking.customer_name?.trim() || "Guest";
  const descriptionLines = [
    `Booking ID: ${booking.id}`,
    `Status: ${booking.status}`,
    booking.customer_phone ? `Phone: ${booking.customer_phone}` : null,
    booking.customer_email ? `Email: ${booking.customer_email}` : null,
    booking.total_price != null ? `Total: $${Number(booking.total_price).toFixed(2)}` : null,
    location ? null : "Location: not available",
  ].filter(Boolean) as string[];

  const start = dateTimePayload(pickupDate, normalizeTime(booking.pickup_time, "00:00"));
  const end = dateTimePayload(returnDate, normalizeTime(booking.return_time, "23:59"));
  const payload = {
    summary: `${customer} — ${vehicleName}`,
    description: descriptionLines.join("\n"),
    location,
    start,
    end,
  };

  return {
    sourceKind: "booking",
    sourceId: booking.id,
    shouldDelete,
    syncHash: hashSyncPayload(JSON.stringify(payload)),
    ...payload,
  };
}

export function buildTuroCalendarEvent(
  row: BlockedDateCalendarInput,
  vehicle: VehicleLookup | undefined,
  todayYmd = getBusinessTodayYyyyMmDd(GCAL_BUSINESS_TIMEZONE)
): BuiltGoogleCalendarEvent | null {
  if (!isTuroBlockedSource(row.source)) return null;
  const cancelled = isBlockedDateCancelled(row);
  const mutable = isTuroTripSyncMutable(row.end_date, todayYmd);
  if (!mutable && !cancelled) return null;

  const guest = getTuroDriverFromReason(row.reason);
  const vehicleName = vehicleLabel(vehicle, row.vehicle_id);
  const location = displayBlockedDateLocation(row.location);
  const hasTimes = Boolean(row.pickup_time || row.return_time);
  const descriptionLines = [
    `Turo trip ID: ${row.id}`,
    row.reason ? `Reason: ${row.reason}` : null,
    row.earnings != null ? `Earnings: $${Number(row.earnings).toFixed(2)}` : null,
    location ? null : "Location: not available",
  ].filter(Boolean) as string[];

  const summary = `${guest || "Turo guest"} (Turo) — ${vehicleName}`;
  const start = hasTimes
    ? dateTimePayload(row.start_date, normalizeTime(row.pickup_time, "00:00"))
    : { date: row.start_date };
  const end = hasTimes
    ? dateTimePayload(row.end_date, normalizeTime(row.return_time, "23:59"))
    : { date: row.end_date };

  const payload = { summary, description: descriptionLines.join("\n"), location, start, end };

  return {
    sourceKind: "turo",
    sourceId: row.id,
    shouldDelete: cancelled,
    syncHash: hashSyncPayload(JSON.stringify(payload)),
    ...payload,
  };
}

export function buildManualBlockCalendarEvent(
  row: BlockedDateCalendarInput,
  vehicle: VehicleLookup | undefined
): BuiltGoogleCalendarEvent | null {
  if (isTuroBlockedSource(row.source)) return null;
  const vehicleName = vehicleLabel(vehicle, row.vehicle_id);
  const location = displayBlockedDateLocation(row.location) || row.location?.trim() || null;
  const reason = row.reason?.trim() || "Blocked";
  const hasTimes = Boolean(row.pickup_time || row.return_time);
  const summary = `Blocked — ${vehicleName} (${reason})`;
  const descriptionLines = [
    `Blocked date ID: ${row.id}`,
    `Reason: ${reason}`,
    location ? null : "Location: not available",
  ].filter(Boolean) as string[];

  const start = hasTimes
    ? dateTimePayload(row.start_date, normalizeTime(row.pickup_time, "00:00"))
    : { date: row.start_date };
  const end = hasTimes
    ? dateTimePayload(row.end_date, normalizeTime(row.return_time, "23:59"))
    : { date: row.end_date };

  const payload = { summary, description: descriptionLines.join("\n"), location, start, end };

  return {
    sourceKind: "blocked",
    sourceId: row.id,
    shouldDelete: false,
    syncHash: hashSyncPayload(JSON.stringify(payload)),
    ...payload,
  };
}

export function toGoogleEventBody(
  built: BuiltGoogleCalendarEvent
): calendar_v3.Schema$Event {
  return {
    summary: built.summary,
    description: built.description,
    location: built.location || undefined,
    start: built.start,
    end: built.end,
    extendedProperties: {
      private: {
        nga_source_kind: built.sourceKind,
        nga_source_id: built.sourceId,
      },
    },
  };
}

export function sourceKey(kind: GoogleCalendarSourceKind, id: string): string {
  return `${kind}:${id}`;
}
