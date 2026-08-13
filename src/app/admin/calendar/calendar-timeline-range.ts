/** Days before today included on the timeline so recently ended trips still render. */
export const TIMELINE_LOOKBACK_DAYS = 21;

/**
 * Days before today for the initial timeline position.
 * This is smaller than TIMELINE_LOOKBACK_DAYS so that today is visible
 * in the mobile agenda view (which only shows 7 days at a time).
 */
export const TIMELINE_MOBILE_OFFSET_DAYS = 3;

export function getDefaultTimelineStart(now: Date = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - TIMELINE_MOBILE_OFFSET_DAYS);
  return start;
}

export function getTimelineStartOfToday(now: Date = new Date()): Date {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return today;
}

/** Returns a timeline start that puts today near the middle of a 7-day mobile view. */
export function getTimelineStartForToday(now: Date = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - TIMELINE_MOBILE_OFFSET_DAYS);
  return start;
}
