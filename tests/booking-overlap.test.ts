import test from "node:test";
import assert from "node:assert/strict";
import {
  bookingIntervalsConflict,
  bookingConflictsWithAny,
  toBookingInterval,
} from "@/lib/utils/booking-overlap";

test("toBookingInterval default times span same calendar day", () => {
  const i = toBookingInterval("2026-04-10", "2026-04-10", null, null);
  assert.ok(i.start.getTime() < i.end.getTime());
});

test("same-day sequential bookings 60+ min apart do not conflict at 60 min gap", () => {
  const a = toBookingInterval("2026-04-10", "2026-04-10", "10:00", "12:00");
  const b = toBookingInterval("2026-04-10", "2026-04-10", "14:00", "16:00");
  assert.equal(bookingIntervalsConflict(a, b, 60), false);
});

test("same-day sequential bookings under 60 min apart conflict at 60 min gap", () => {
  const a = toBookingInterval("2026-04-10", "2026-04-10", "10:00", "12:00");
  const b = toBookingInterval("2026-04-10", "2026-04-10", "12:30", "14:00");
  assert.equal(bookingIntervalsConflict(a, b, 60), true);
});

test("overlapping intervals always conflict regardless of min gap", () => {
  const a = toBookingInterval("2026-04-10", "2026-04-10", "10:00", "14:00");
  const b = toBookingInterval("2026-04-10", "2026-04-10", "13:00", "16:00");
  assert.equal(bookingIntervalsConflict(a, b, 60), true);
  assert.equal(bookingIntervalsConflict(a, b, 0), true);
});

test("touching boundaries: no overlap at 0 min gap mode", () => {
  const a = toBookingInterval("2026-04-10", "2026-04-10", "10:00", "12:00");
  const b = toBookingInterval("2026-04-10", "2026-04-10", "12:00", "14:00");
  assert.equal(bookingIntervalsConflict(a, b, 0), false);
});

test("bookingConflictsWithAny aggregates rows", () => {
  const proposed = toBookingInterval("2026-04-10", "2026-04-10", "14:00", "16:00");
  const rows = [
    {
      pickup_date: "2026-04-10",
      return_date: "2026-04-10",
      pickup_time: "10:00",
      return_time: "12:00",
    },
  ];
  assert.equal(bookingConflictsWithAny(proposed, rows, 60), false);
});
