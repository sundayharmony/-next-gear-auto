import test from "node:test";
import assert from "node:assert/strict";
import {
  bookingOverlapsRange,
  countBookedDaysInRange,
  prorateBookingRevenueInRange,
  prorateTripRevenueInRange,
  forEachProratedBookingDayInRange,
} from "@/lib/finance/booking-proration";

test("bookingOverlapsRange detects partial overlap", () => {
  assert.equal(bookingOverlapsRange("2026-05-29", "2026-06-05", "2026-06-01", "2026-06-10"), true);
  assert.equal(bookingOverlapsRange("2026-05-08", "2026-05-15", "2026-06-01", "2026-06-10"), false);
});

test("countBookedDaysInRange counts only in-range days", () => {
  assert.equal(countBookedDaysInRange("2026-05-29", "2026-06-05", "2026-06-01", "2026-06-10"), 5);
  assert.equal(countBookedDaysInRange("2026-06-03", "2026-06-07", "2026-06-01", "2026-06-10"), 5);
});

test("prorateBookingRevenueInRange spreads evenly across trip days", () => {
  // 8-day trip ($400) → $50/day; 5 days in June range → $250
  assert.equal(
    prorateBookingRevenueInRange(400, "2026-05-29", "2026-06-05", "2026-06-01", "2026-06-10"),
    250
  );
  // Fully inside range → full price
  assert.equal(
    prorateBookingRevenueInRange(300, "2026-06-01", "2026-06-03", "2026-06-01", "2026-06-10"),
    300
  );
  // No overlap → 0
  assert.equal(
    prorateBookingRevenueInRange(300, "2026-05-08", "2026-05-15", "2026-06-01", "2026-06-10"),
    0
  );
});

test("prorateTripRevenueInRange matches booking helper for same dates", () => {
  const fullTrip = prorateTripRevenueInRange("2026-06-06", "2026-06-09", 105.55, "2026-06-01", "2026-06-10");
  assert.equal(
    fullTrip,
    prorateBookingRevenueInRange(105.55, "2026-06-06", "2026-06-09", "2026-06-01", "2026-06-10")
  );
  assert.equal(fullTrip, 105.55);

  const partialTrip = prorateTripRevenueInRange("2026-06-06", "2026-06-15", 400, "2026-06-01", "2026-06-10");
  assert.ok(partialTrip > 0 && partialTrip < 400);
});

test("forEachProratedBookingDayInRange only emits in-range days", () => {
  const days: string[] = [];
  forEachProratedBookingDayInRange(
    "2026-05-29",
    "2026-06-03",
    400,
    "2026-06-01",
    "2026-06-10",
    (dayStr) => days.push(dayStr)
  );
  assert.deepEqual(days, ["2026-06-01", "2026-06-02", "2026-06-03"]);
});
