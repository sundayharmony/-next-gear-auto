import test from "node:test";
import assert from "node:assert/strict";
import {
  getDefaultTimelineStart,
  TIMELINE_LOOKBACK_DAYS,
} from "@/app/admin/calendar/calendar-timeline-range";

test("default timeline start includes lookback before today", () => {
  const now = new Date("2026-06-27T15:30:00");
  const start = getDefaultTimelineStart(now);
  assert.equal(start.getFullYear(), 2026);
  assert.equal(start.getMonth(), 5);
  assert.equal(start.getDate(), 27 - TIMELINE_LOOKBACK_DAYS);
});
