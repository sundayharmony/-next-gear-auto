import test from "node:test";
import assert from "node:assert/strict";
import {
  formatYyyyMmDdLocal,
  isYyyyMmDd,
  isoDateOrderingOk,
  localMidnightFromYyyyMmDd,
  wholeCalendarDaysBetween,
} from "@/lib/utils/booking-dates";
import { excludeBookingRow } from "@/lib/utils/booking-overlap";

test("isYyyyMmDd accepts valid ISO calendar dates", () => {
  assert.equal(isYyyyMmDd("2026-04-15"), true);
  assert.equal(isYyyyMmDd("2024-02-29"), true);
  assert.equal(isYyyyMmDd("not-a-date"), false);
  assert.equal(isYyyyMmDd("2026-13-01"), false);
  assert.equal(isYyyyMmDd(""), false);
});

test("isoDateOrderingOk", () => {
  assert.equal(isoDateOrderingOk("2026-04-01", "2026-04-02"), true);
  assert.equal(isoDateOrderingOk("2026-04-01", "2026-04-01"), true);
  assert.equal(isoDateOrderingOk("2026-04-02", "2026-04-01"), false);
});

test("formatYyyyMmDdLocal is stable for local calendar cells", () => {
  const d = new Date(2026, 5, 15);
  assert.equal(formatYyyyMmDdLocal(d), "2026-06-15");
});

test("wholeCalendarDaysBetween counts local midnights", () => {
  assert.equal(wholeCalendarDaysBetween("2026-04-01", "2026-04-01"), 1);
  assert.equal(wholeCalendarDaysBetween("2026-04-01", "2026-04-02"), 1);
  assert.equal(wholeCalendarDaysBetween("2026-04-01", "2026-04-03"), 2);
});

test("localMidnightFromYyyyMmDd matches calendar day in America/New_York", () => {
  const prev = process.env.TZ;
  process.env.TZ = "America/New_York";
  try {
    const iso = "2026-06-15";
    const naive = new Date(iso);
    naive.setHours(0, 0, 0, 0);
    const local = localMidnightFromYyyyMmDd(iso);
    assert.equal(local.getFullYear(), 2026);
    assert.equal(local.getMonth(), 5);
    assert.equal(local.getDate(), 15);
    assert.notEqual(naive.getDate(), local.getDate(), "UTC date-only parse should not match local calendar day in NY");
  } finally {
    if (prev === undefined) delete process.env.TZ;
    else process.env.TZ = prev;
  }
});

test("excludeBookingRow removes one id", () => {
  const rows = [
    { id: "a", pickup_date: "2026-04-01", return_date: "2026-04-02", pickup_time: "10:00", return_time: "12:00" },
    { id: "b", pickup_date: "2026-04-05", return_date: "2026-04-06", pickup_time: "10:00", return_time: "12:00" },
  ];
  assert.equal(excludeBookingRow(rows, "a").length, 1);
  assert.equal(excludeBookingRow(rows, "a")[0].id, "b");
  assert.equal(excludeBookingRow(rows, undefined).length, 2);
});
