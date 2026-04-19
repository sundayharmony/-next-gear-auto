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
