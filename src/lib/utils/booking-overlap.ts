import { NextResponse } from "next/server";
import { formatYyyyMmDdLocal } from "@/lib/utils/booking-dates";
import { getBookingOccupancyEndDate } from "@/lib/utils/recurring-booking";
import { isActiveCalendarBlock } from "@/lib/utils/blocked-dates";

export type BookingOverlapMode = "default" | "manager";

const DEFAULT_STATUSES = ["confirmed", "active", "pending"] as const;
const MANAGER_STATUSES = ["confirmed", "active"] as const;

/** Single source of truth for POST /bookings, check-overlap GET, and tooling. */
export function overlapConfigForMode(mode: BookingOverlapMode): {
  statuses: readonly string[];
  minGapMinutes: number;
} {
  if (mode === "manager") {
    return { statuses: MANAGER_STATUSES, minGapMinutes: 0 };
  }
  return { statuses: DEFAULT_STATUSES, minGapMinutes: 60 };
}

export interface BookingInterval {
  start: Date;
  end: Date;
}

/** Build local-midnight-based interval from booking date/time fields (matches prior API behavior). */
export function toBookingInterval(
  pickupDate: string,
  returnDate: string,
  pickupTime: string | null,
  returnTime: string | null,
): BookingInterval {
  const pu = pickupTime?.trim() || "00:00";
  const rt = returnTime?.trim() || "23:59";
  return {
    start: new Date(`${pickupDate}T${pu}`),
    end: new Date(`${returnDate}T${rt}`),
  };
}

/**
 * True if the two rental intervals overlap, or are separated by less than minGapMinutes.
 * Touching boundaries (gap 0) are not overlap; for minGapMinutes 0, only true overlap conflicts.
 */
export function bookingIntervalsConflict(
  proposed: BookingInterval,
  existing: BookingInterval,
  minGapMinutes: number,
): boolean {
  const { start: aStart, end: aEnd } = proposed;
  const { start: bStart, end: bEnd } = existing;
  const minMs = minGapMinutes * 60_000;

  if (aStart < bEnd && aEnd > bStart) {
    return true;
  }

  if (aEnd.getTime() <= bStart.getTime()) {
    const gap = bStart.getTime() - aEnd.getTime();
    return gap >= 0 && gap < minMs;
  }

  if (bEnd.getTime() <= aStart.getTime()) {
    const gap = aStart.getTime() - bEnd.getTime();
    return gap >= 0 && gap < minMs;
  }

  return false;
}

export type OverlapBookingRow = {
  id?: string;
  pickup_date: string;
  return_date: string;
  pickup_time: string | null;
  return_time: string | null;
  admin_notes?: string | null;
  status?: string;
};

export function toOccupancyInterval(
  row: OverlapBookingRow,
  todayYyyyMmDd: string = formatYyyyMmDdLocal(new Date())
): BookingInterval {
  const endDate = getBookingOccupancyEndDate(row, todayYyyyMmDd);
  return toBookingInterval(
    row.pickup_date,
    endDate,
    row.pickup_time,
    row.return_time
  );
}

/** Keep bookings whose occupancy window intersects [proposedPickup, proposedReturn]. */
export function filterOccupyingBookings(
  rows: OverlapBookingRow[],
  proposedPickupDate: string,
  proposedReturnDate: string,
  todayYyyyMmDd: string = formatYyyyMmDdLocal(new Date())
): OverlapBookingRow[] {
  const pu = proposedPickupDate.split("T")[0];
  const rd = proposedReturnDate.split("T")[0];
  return rows.filter((row) => {
    const pk = row.pickup_date.split("T")[0];
    const end = getBookingOccupancyEndDate(row, todayYyyyMmDd);
    return pk <= rd && end >= pu;
  });
}

export function bookingConflictsWithAny(
  proposed: BookingInterval,
  rows: OverlapBookingRow[],
  minGapMinutes: number,
  todayYyyyMmDd: string = formatYyyyMmDdLocal(new Date())
): boolean {
  return rows.some((row) =>
    bookingIntervalsConflict(
      proposed,
      toOccupancyInterval(row, todayYyyyMmDd),
      minGapMinutes
    )
  );
}

async function hasBlockedDateOverlap(
  supabase: { from: (t: string) => any },
  vehicleId: string,
  pickupDate: string,
  returnDate: string,
): Promise<boolean> {
  const { data: blocks } = await supabase
    .from("blocked_dates")
    .select("id, cancelled_at, reason")
    .eq("vehicle_id", vehicleId)
    .lte("start_date", returnDate)
    .gte("end_date", pickupDate)
    .limit(20);

  const activeBlocks = (blocks || []).filter(isActiveCalendarBlock);
  return activeBlocks.length > 0;
}

export interface CheckBookingOverlapOptions {
  mode?: BookingOverlapMode;
  /** When updating an existing booking, ignore this row (same id) so it does not conflict with itself. */
  excludeBookingId?: string;
}

export function excludeBookingRow<T extends OverlapBookingRow>(
  rows: T[] | null | undefined,
  excludeBookingId: string | undefined,
): T[] {
  if (!rows?.length || !excludeBookingId) return rows ?? [];
  return rows.filter((r) => r.id !== excludeBookingId);
}

/**
 * Check for booking overlap; returns a 409 response if conflict found, or null if clear.
 * - default: pending + confirmed + active, 60-minute turnover gap, blocked_dates enforced
 * - manager: confirmed + active only, no gap (true overlap only), blocked_dates enforced
 */
export async function checkBookingOverlap(
  supabase: any,
  vehicleId: string,
  pickupDate: string,
  returnDate: string,
  pickupTime: string | null,
  returnTime: string | null,
  options: CheckBookingOverlapOptions = {},
): Promise<NextResponse | null> {
  const mode: BookingOverlapMode = options.mode ?? "default";
  const { statuses, minGapMinutes } = overlapConfigForMode(mode);

  const today = formatYyyyMmDdLocal(new Date());

  const { data: conflictingRaw } = await supabase
    .from("bookings")
    .select("id, pickup_date, return_date, pickup_time, return_time, admin_notes, status")
    .eq("vehicle_id", vehicleId)
    .in("status", [...statuses])
    .lte("pickup_date", returnDate);

  const conflicting = filterOccupyingBookings(
    excludeBookingRow(conflictingRaw, options.excludeBookingId),
    pickupDate,
    returnDate,
    today
  );

  const proposed = toBookingInterval(pickupDate, returnDate, pickupTime, returnTime);

  if (conflicting.length) {
    const hasBookingConflict = bookingConflictsWithAny(
      proposed,
      conflicting,
      minGapMinutes,
      today
    );
    if (hasBookingConflict) {
      const message =
        mode === "manager"
          ? "This vehicle already has a confirmed or active booking overlapping those times."
          : "This vehicle is already booked for the selected dates. Bookings on the same day must be at least 60 minutes apart.";
      return NextResponse.json({ success: false, message }, { status: 409 });
    }
  }

  const blocked = await hasBlockedDateOverlap(supabase, vehicleId, pickupDate, returnDate);
  if (blocked) {
    return NextResponse.json(
      {
        success: false,
        message: "This vehicle has blocked dates in this range (for example Turo or a manual block).",
      },
      { status: 409 },
    );
  }

  return null;
}
