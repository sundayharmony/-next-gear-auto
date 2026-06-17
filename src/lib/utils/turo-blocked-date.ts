import { storedTuroLocation } from "@/lib/utils/turo-email-parser";

/** Admin calendar/bookings list label — guest first so search and timeline bars match Turo. */
export function formatTuroOccupancyCustomerName(
  reason: string | null | undefined,
  vehicleName: string
): string {
  const guest = getTuroDriverFromReason(reason);
  if (guest) return `${guest} (Turo)`;
  return `${vehicleName || "Unknown Vehicle"} on TURO`;
}

export function getTuroDriverFromReason(reason: string | null | undefined): string | null {
  if (!reason) return null;
  const text = reason.trim();

  // Matches forms like:
  // "Turo: Noah"
  // "Turo (extended): Noah — $158.19"
  const match = text.match(/^Turo(?:\s*\(extended\))?\s*:\s*([^—]+?)(?:\s*—|$)/i);
  if (!match) return null;
  const name = match[1].trim();
  return name || null;
}

/**
 * Decide whether to write `location` on merge/update.
 * Fills missing/invalid stored values; replaces junk; optional force on reconcile.
 */
export function mergeTuroLocationField(
  existing: string | null | undefined,
  parsed: string | null | undefined,
  opts?: { forceRefresh?: boolean }
): string | null | undefined {
  const parsedClean = storedTuroLocation(parsed);
  const existingClean = storedTuroLocation(existing);
  if (parsedClean) {
    if (!existingClean || opts?.forceRefresh) return parsedClean;
    return undefined;
  }
  if (existing && !existingClean) return null;
  return undefined;
}

/** Use DB `earnings` when set; otherwise parse the last `$…` amount from `reason` (Turo webhook stores totals there). */
export function resolveTuroTripRevenue(block: {
  earnings?: number | string | null;
  reason?: string | null;
}): number {
  const raw = block.earnings;
  const fromColumn = typeof raw === "string" ? parseFloat(String(raw).replace(/,/g, "")) : Number(raw);
  if (Number.isFinite(fromColumn) && fromColumn > 0) return fromColumn;
  if (!block.reason) return 0;
  const matches = [...block.reason.matchAll(/\$\s*([\d,]+(?:\.\d{1,2})?)/g)];
  if (matches.length === 0) return 0;
  const last = matches[matches.length - 1][1].replace(/,/g, "");
  const parsed = parseFloat(last);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/** Inclusive calendar-day count from YYYY-MM-DD to YYYY-MM-DD (local). */
export function countInclusiveTripDays(startDate: string, endDate: string): number {
  const start = new Date(startDate + "T12:00:00");
  const end = new Date(endDate + "T12:00:00");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Spread trip revenue evenly across each calendar day (for daily charts).
 * Only adds to `dayMap` keys that exist (chart day bucket).
 */
export function addProratedTuroRevenueByDay(
  block: { start_date: string; end_date: string; earnings?: number | string | null; reason?: string | null },
  revenue: number,
  dayMap: Map<string, number>,
  days: { date: string; revenue: number }[]
): void {
  if (!(revenue > 0)) return;
  const tripDays = countInclusiveTripDays(block.start_date, block.end_date);
  if (tripDays < 1) return;
  const perDay = revenue / tripDays;
  const cursor = new Date(block.start_date + "T12:00:00");
  const endDt = new Date(block.end_date + "T12:00:00");
  while (cursor <= endDt) {
    const key = cursor.toISOString().split("T")[0];
    const idx = dayMap.get(key);
    if (idx !== undefined) days[idx].revenue += perDay;
    cursor.setDate(cursor.getDate() + 1);
  }
}

/** Each calendar day of the trip receives `revenue / tripDays` (same `amount` for every day). */
export function forEachProratedTuroDay(
  block: { start_date: string; end_date: string },
  revenue: number,
  onDay: (dayStr: string, monthKeyYYYYMM: string, amount: number) => void
): void {
  if (!(revenue > 0)) return;
  const tripDays = countInclusiveTripDays(block.start_date, block.end_date);
  if (tripDays < 1) return;
  const perDay = revenue / tripDays;
  const cursor = new Date(block.start_date + "T12:00:00");
  const endDt = new Date(block.end_date + "T12:00:00");
  while (cursor <= endDt) {
    const dayStr = cursor.toISOString().split("T")[0];
    const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    onDay(dayStr, monthKey, perDay);
    cursor.setDate(cursor.getDate() + 1);
  }
}
