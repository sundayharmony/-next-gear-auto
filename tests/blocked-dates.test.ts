import test from "node:test";
import assert from "node:assert/strict";
import {
  TURO_BLOCKED_SOURCE,
  filterActiveTuroTrips,
  filterManualBlockedDates,
  isActiveCalendarBlock,
  isBlockedDateCancelled,
  isTuroBlockedSource,
} from "../src/lib/utils/blocked-dates";

test("isTuroBlockedSource identifies turo-email only", () => {
  assert.equal(isTuroBlockedSource(TURO_BLOCKED_SOURCE), true);
  assert.equal(isTuroBlockedSource("manual"), false);
  assert.equal(isTuroBlockedSource("owner"), false);
});

test("filterManualBlockedDates excludes Turo trips", () => {
  const rows = [
    { id: "1", source: "manual" },
    { id: "2", source: TURO_BLOCKED_SOURCE },
    { id: "3", source: "owner" },
  ];
  const manual = filterManualBlockedDates(rows);
  assert.equal(manual.length, 2);
  assert.deepEqual(manual.map((r) => r.id), ["1", "3"]);
});

test("filterActiveTuroTrips keeps active Turo only", () => {
  const rows = [
    { id: "a", source: TURO_BLOCKED_SOURCE, cancelled_at: null },
    { id: "b", source: TURO_BLOCKED_SOURCE, cancelled_at: "2026-06-01T12:00:00Z" },
    { id: "c", source: "manual", cancelled_at: null },
  ];
  const active = filterActiveTuroTrips(rows);
  assert.equal(active.length, 1);
  assert.equal(active[0].id, "a");
});

test("isBlockedDateCancelled detects reason prefix fallback", () => {
  assert.equal(
    isBlockedDateCancelled({ reason: "[CANCELLED] 2026-06-01 — Turo: Alex" }),
    true
  );
  assert.equal(isBlockedDateCancelled({ reason: "Turo: Alex", cancelled_at: null }), false);
});

test("isActiveCalendarBlock false when cancelled", () => {
  assert.equal(isActiveCalendarBlock({ cancelled_at: null }), true);
  assert.equal(isActiveCalendarBlock({ cancelled_at: "2026-01-01T00:00:00Z" }), false);
  assert.equal(isActiveCalendarBlock({ reason: "[CANCELLED] note" }), false);
});
