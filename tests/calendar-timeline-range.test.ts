import test from "node:test";
import assert from "node:assert/strict";
import {
  getDefaultTimelineStart,
  getDesktopTimelineStart,
  getMobileTimelineStart,
  getTimelineStartForToday,
  TIMELINE_LOOKBACK_DAYS,
  TIMELINE_MOBILE_OFFSET_DAYS,
} from "@/app/admin/calendar/calendar-timeline-range";

test("desktop timeline start keeps the 21-day lookback", () => {
  const now = new Date("2026-06-27T15:30:00");
  const start = getDesktopTimelineStart(now);
  assert.equal(start.getFullYear(), 2026);
  assert.equal(start.getMonth(), 5);
  assert.equal(start.getDate(), 27 - TIMELINE_LOOKBACK_DAYS);
});

test("default timeline start matches desktop lookback", () => {
  const now = new Date("2026-06-27T15:30:00");
  assert.equal(
    getDefaultTimelineStart(now).getTime(),
    getDesktopTimelineStart(now).getTime()
  );
});

test("mobile timeline start keeps today in the 7-day strip", () => {
  const now = new Date("2026-06-27T15:30:00");
  const start = getMobileTimelineStart(now);
  assert.equal(start.getDate(), 27 - TIMELINE_MOBILE_OFFSET_DAYS);
  const todayOffset = 27 - start.getDate();
  assert.ok(todayOffset >= 0 && todayOffset <= 6);
});

test("getTimelineStartForToday recenters the mobile strip on today", () => {
  const now = new Date("2026-06-27T15:30:00");
  assert.equal(
    getTimelineStartForToday(now).getTime(),
    getMobileTimelineStart(now).getTime()
  );
});
