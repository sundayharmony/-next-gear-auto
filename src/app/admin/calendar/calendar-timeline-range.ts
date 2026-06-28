/** Days before today included on the timeline so recently ended trips still render. */
export const TIMELINE_LOOKBACK_DAYS = 21;

export function getDefaultTimelineStart(now: Date = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - TIMELINE_LOOKBACK_DAYS);
  return start;
}

export function getTimelineStartOfToday(now: Date = new Date()): Date {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return today;
}
