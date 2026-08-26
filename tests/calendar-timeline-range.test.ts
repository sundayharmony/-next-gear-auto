import test from "node:test";
import assert from "node:assert/strict";
import {
  getDefaultTimelineStart,
  getTimelineStartForToday,
  TIMELINE_MOBILE_OFFSET_DAYS,
} from "@/app/admin/calendar/calendar-timeline-range";

test("default timeline start is a few days before today for mobile visibility", () => {
  const now = new Date("2026-06-27T15:30:00");
  const start = getDefaultTimelineStart(now);
  assert.equal(start.getFullYear(), 2026);
  assert.equal(start.getMonth(), 5);
  assert.equal(start.getDate(), 27 - TIMELINE_MOBILE_OFFSET_DAYS);
});

test("getTimelineStartForToday returns same as default start", () => {
  const now = new Date("2026-06-27T15:30:00");
  const start1 = getDefaultTimelineStart(now);
  const start2 = getTimelineStartForToday(now);
  assert.equal(start1.getTime(), start2.getTime());
});
