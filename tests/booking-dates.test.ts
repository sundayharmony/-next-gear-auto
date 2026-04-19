import test from "node:test";
import assert from "node:assert/strict";
import { isYyyyMmDd, isoDateOrderingOk } from "@/lib/utils/booking-dates";
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

test("excludeBookingRow removes one id", () => {
  const rows = [
    { id: "a", pickup_date: "2026-04-01", return_date: "2026-04-02", pickup_time: "10:00", return_time: "12:00" },
    { id: "b", pickup_date: "2026-04-05", return_date: "2026-04-06", pickup_time: "10:00", return_time: "12:00" },
  ];
  assert.equal(excludeBookingRow(rows, "a").length, 1);
  assert.equal(excludeBookingRow(rows, "a")[0].id, "b");
  assert.equal(excludeBookingRow(rows, undefined).length, 2);
});
