/** Shared calendar domain types and span math for admin/manager calendar views. */

export interface BlockedDateEntry {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  pickup_time: string | null;
  return_time: string | null;
  location: string | null;
  earnings: number | null;
  source: string;
  reason: string | null;
  is_extension: boolean | null;
  original_end_date: string | null;
}

export interface VisibleSpan {
  startIdx: number;
  endIdx: number;
  extendsLeft: boolean;
  extendsRight: boolean;
  startFraction: number;
  endFraction: number;
}

export function parseTimeFraction(time: string | null | undefined, fallback: number) {
  if (!time) return fallback;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h)) return fallback;
  return Math.min(1, Math.max(0, (h + (m || 0) / 60) / 24));
}

export function getVisibleEventSpan(
  startDate: string,
  endDate: string,
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  dateKeys: string[]
): VisibleSpan | null {
  const rangeStart = dateKeys[0];
  const rangeEnd = dateKeys[dateKeys.length - 1];

  if (endDate < rangeStart || startDate > rangeEnd) return null;

  const clampedStart = startDate < rangeStart ? rangeStart : startDate;
  const clampedEnd = endDate > rangeEnd ? rangeEnd : endDate;

  const startIdx = dateKeys.indexOf(clampedStart);
  const endIdx = dateKeys.indexOf(clampedEnd);
  if (startIdx === -1 || endIdx === -1) return null;

  const extendsLeft = startDate < rangeStart;
  const extendsRight = endDate > rangeEnd;

  const startFraction = extendsLeft ? 0 : parseTimeFraction(startTime, 0);
  const endFraction = extendsRight ? 1 : parseTimeFraction(endTime, 1);

  return { startIdx, endIdx, extendsLeft, extendsRight, startFraction, endFraction };
}
