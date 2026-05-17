import type { BookingDbRow } from "@/lib/types";
import { formatYyyyMmDdLocal } from "@/lib/utils/booking-dates";
import {
  getDisplayReturnDate,
  parseRecurringBookingMeta,
} from "@/lib/utils/recurring-booking";

type CalendarBooking = Pick<
  BookingDbRow,
  "pickup_date" | "return_date" | "admin_notes" | "effective_return_date" | "status"
>;

export function getCalendarPickupDateKey(booking: CalendarBooking): string {
  return (booking.pickup_date || "").split("T")[0];
}

/**
 * End date for calendar spans. Recurring long-term rentals use the rolled weekly due date
 * (and extend through today while active so the timeline reads as a continuous rental).
 */
export function getCalendarReturnDateKey(booking: CalendarBooking): string {
  const pickupKey = getCalendarPickupDateKey(booking);
  let endKey = getDisplayReturnDate(
    booking.return_date,
    booking.admin_notes,
    booking.effective_return_date
  ).split("T")[0];

  const meta = parseRecurringBookingMeta(booking.admin_notes);
  if (
    meta.isRecurringLongTerm &&
    meta.weeklyDueDay &&
    booking.status === "active"
  ) {
    const todayKey = formatYyyyMmDdLocal(new Date());
    if (todayKey > pickupKey && todayKey > endKey) {
      endKey = todayKey;
    }
  }

  return endKey;
}

export function bookingOverlapsDateRange(
  booking: CalendarBooking,
  rangeStart: string,
  rangeEnd: string
): boolean {
  const pk = getCalendarPickupDateKey(booking);
  const rk = getCalendarReturnDateKey(booking);
  return !(rk < rangeStart || pk > rangeEnd);
}

export function bookingActiveOnDateKey(booking: CalendarBooking, dateKey: string): boolean {
  const pk = getCalendarPickupDateKey(booking);
  const rk = getCalendarReturnDateKey(booking);
  return pk <= dateKey && rk >= dateKey;
}

/** Timeline rows: fleet vehicles marked available for rent. */
export function filterTimelineVehicles<T extends { isAvailable: boolean }>(vehicles: T[]): T[] {
  return vehicles.filter((v) => v.isAvailable);
}
