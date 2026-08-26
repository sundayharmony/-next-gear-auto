/** Days before today included on the desktop timeline so recently ended trips still render. */
export const TIMELINE_LOOKBACK_DAYS = 21;

/**
 * Days before today for the mobile 7-day agenda so today stays in the strip.
 * Smaller than TIMELINE_LOOKBACK_DAYS because the mobile view only shows 7 days.
 */
export const TIMELINE_MOBILE_OFFSET_DAYS = 3;

function startDaysBeforeToday(days: number, now: Date = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days);
  return start;
}

export function getDesktopTimelineStart(now: Date = new Date()): Date {
  return startDaysBeforeToday(TIMELINE_LOOKBACK_DAYS, now);
}

export function getMobileTimelineStart(now: Date = new Date()): Date {
  return startDaysBeforeToday(TIMELINE_MOBILE_OFFSET_DAYS, now);
}

/** Desktop default: 21-day lookback for the 180-day timeline. */
export function getDefaultTimelineStart(now: Date = new Date()): Date {
  return getDesktopTimelineStart(now);
}

export function getTimelineStartOfToday(now: Date = new Date()): Date {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return today;
}

/** Mobile Today: center today in the 7-day agenda strip. */
export function getTimelineStartForToday(now: Date = new Date()): Date {
  return getMobileTimelineStart(now);
}
