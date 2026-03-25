/**
 * Parse a date string as LOCAL time (not UTC).
 * "2024-01-15" → January 15 in user's timezone, not UTC.
 * If the string already contains "T" (ISO datetime), use it as-is.
 */
function parseLocalDate(dateStr: string): Date {
  if (dateStr.includes("T")) return new Date(dateStr);
  // Parse YYYY-MM-DD as local date by extracting components
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = parseLocalDate(dateStr);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function formatDateShort(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function isDateInPast(dateStr: string): boolean {
  const date = parseLocalDate(dateStr);
  const now = new Date();
  // Compare date portion only (ignore time)
  now.setHours(0, 0, 0, 0);
  return date < now;
}

export function isDateAfter(dateStr1: string, dateStr2: string): boolean {
  return parseLocalDate(dateStr1) > parseLocalDate(dateStr2);
}

export function getMinPickupDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  // Build YYYY-MM-DD from local time to avoid UTC timezone shift
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const d = String(tomorrow.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysBetween(date1: string, date2: string): number {
  const d1 = parseLocalDate(date1);
  const d2 = parseLocalDate(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
