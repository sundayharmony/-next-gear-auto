import { getLocalYmd } from "@/lib/utils/date-helpers";
import { countInclusiveTripDays } from "@/lib/utils/turo-blocked-date";

/** Trip overlaps [from, to] inclusive (YYYY-MM-DD). */
export function bookingOverlapsRange(
  pickup: string,
  returnDate: string,
  from: string,
  to: string
): boolean {
  return pickup <= to && returnDate >= from;
}

/** Inclusive calendar days of the trip that fall inside the selected range. */
export function countBookedDaysInRange(
  pickup: string,
  returnDate: string,
  from: string,
  to: string
): number {
  if (!bookingOverlapsRange(pickup, returnDate, from, to)) return 0;
  const start = pickup > from ? pickup : from;
  const end = returnDate < to ? returnDate : to;
  return countInclusiveTripDays(start, end);
}

/** Prorate trip revenue to days that fall inside [rangeFrom, rangeTo]. */
export function prorateTripRevenueInRange(
  startDate: string,
  endDate: string,
  totalRevenue: number,
  rangeFrom: string,
  rangeTo: string
): number {
  const tripDays = countInclusiveTripDays(startDate, endDate);
  if (tripDays < 1 || !(totalRevenue > 0)) return 0;
  const daysInRange = countBookedDaysInRange(startDate, endDate, rangeFrom, rangeTo);
  if (daysInRange < 1) return 0;
  return (totalRevenue / tripDays) * daysInRange;
}

export function prorateBookingRevenueInRange(
  totalPrice: number,
  pickup: string,
  returnDate: string,
  from: string,
  to: string
): number {
  return prorateTripRevenueInRange(pickup, returnDate, totalPrice, from, to);
}

/** Spread booking revenue across each in-range calendar day (for charts). */
export function forEachProratedBookingDayInRange(
  pickup: string,
  returnDate: string,
  totalPrice: number,
  rangeFrom: string,
  rangeTo: string,
  onDay: (dayStr: string, monthKey: string, amount: number) => void
): void {
  if (!bookingOverlapsRange(pickup, returnDate, rangeFrom, rangeTo)) return;
  const tripDays = countInclusiveTripDays(pickup, returnDate);
  if (tripDays < 1 || !(totalPrice > 0)) return;
  const perDay = totalPrice / tripDays;

  const tripStart = new Date(pickup + "T12:00:00");
  const tripEnd = new Date(returnDate + "T12:00:00");
  const rangeStart = new Date(rangeFrom + "T12:00:00");
  const rangeEnd = new Date(rangeTo + "T12:00:00");
  const cursor = new Date(Math.max(tripStart.getTime(), rangeStart.getTime()));
  const endDt = new Date(Math.min(tripEnd.getTime(), rangeEnd.getTime()));

  while (cursor <= endDt) {
    const dayStr = getLocalYmd(cursor);
    const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    onDay(dayStr, monthKey, perDay);
    cursor.setDate(cursor.getDate() + 1);
  }
}

/** Add prorated booking revenue to daily chart buckets (only days present in dayMap). */
export function addProratedBookingRevenueByDay(
  pickup: string,
  returnDate: string,
  totalPrice: number,
  rangeFrom: string,
  rangeTo: string,
  dayMap: Map<string, number>,
  days: { date: string; revenue: number }[]
): void {
  forEachProratedBookingDayInRange(pickup, returnDate, totalPrice, rangeFrom, rangeTo, (dayStr, _monthKey, amt) => {
    const idx = dayMap.get(dayStr);
    if (idx !== undefined) days[idx].revenue += amt;
  });
}
