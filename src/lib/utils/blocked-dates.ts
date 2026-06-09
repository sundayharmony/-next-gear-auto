/** Turo trips synced from email webhooks — stored in blocked_dates but managed separately from manual blocks. */
export const TURO_BLOCKED_SOURCE = "turo-email" as const;

/** Fallback when cancelled_at column is not migrated yet. */
export const CANCELLED_REASON_PREFIX = "[CANCELLED]";

export function isTuroBlockedSource(source: string | null | undefined): boolean {
  return source === TURO_BLOCKED_SOURCE;
}

/** Manual, owner, and other non-Turo blocks (calendar maintenance, personal use, etc.). */
export function isManualBlockedSource(source: string | null | undefined): boolean {
  return !isTuroBlockedSource(source);
}

export function isBlockedDateCancelled(row: {
  cancelled_at?: string | null;
  reason?: string | null;
}): boolean {
  if (row.cancelled_at) return true;
  return Boolean(row.reason?.trimStart().startsWith(CANCELLED_REASON_PREFIX));
}

/** Rows that still occupy the vehicle on the public booking calendar. */
export function isActiveCalendarBlock(row: {
  cancelled_at?: string | null;
  reason?: string | null;
}): boolean {
  return !isBlockedDateCancelled(row);
}

export function filterActiveCalendarBlocks<T extends { cancelled_at?: string | null }>(rows: T[]): T[] {
  return rows.filter(isActiveCalendarBlock);
}

export function filterManualBlockedDates<T extends { source?: string | null }>(rows: T[]): T[] {
  return rows.filter((r) => isManualBlockedSource(r.source));
}

export function filterActiveTuroTrips<
  T extends { source?: string | null; cancelled_at?: string | null },
>(rows: T[]): T[] {
  return rows.filter((r) => isTuroBlockedSource(r.source) && isActiveCalendarBlock(r));
}
