/**
 * Local calendar midnight for `YYYY-MM-DD`.
 * `new Date("yyyy-mm-dd")` (date-only) is parsed as UTC midnight, which becomes the **previous**
 * calendar day in US timezones after `setHours(0,0,0,0)`, breaking “pickup today” checks.
 */
export function localMidnightFromYyyyMmDd(iso: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date(NaN);
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** Local calendar `YYYY-MM-DD` from a `Date` (e.g. calendar grid cells). Avoid `toISOString().slice(0,10)` — UTC can shift the day. */
export function formatYyyyMmDdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Validate calendar date string (YYYY-MM-DD) used across bookings APIs. */
export function isYyyyMmDd(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(value + "T12:00:00");
  return !isNaN(dt.getTime());
}

/** Lexicographic compare works for ISO dates; true if a <= b. */
export function isoDateOrderingOk(pickupDate: string, returnDate: string): boolean {
  return pickupDate <= returnDate;
}

/** Inclusive-style calendar day count for rental pricing (local midnights). Minimum 1. */
export function wholeCalendarDaysBetween(pickupYyyyMmDd: string, returnYyyyMmDd: string): number {
  const start = localMidnightFromYyyyMmDd(pickupYyyyMmDd);
  const end = localMidnightFromYyyyMmDd(returnYyyyMmDd);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}
