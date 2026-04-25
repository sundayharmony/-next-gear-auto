import test from "node:test";
import assert from "node:assert/strict";
import { calculatePricing, calculateRentalHours } from "@/lib/utils/price-calculator";
import type { BookingExtra } from "@/lib/types";

const noExtras: BookingExtra[] = [];

test("calculateRentalHours rounds up partial hours", () => {
  const hours = calculateRentalHours("2026-04-25", "2026-04-25", "10:00", "12:15");
  assert.equal(hours, 3);
});

test("calculatePricing uses hourly rate derived from daily", () => {
  const pricing = calculatePricing(6, 48, noExtras);
  assert.equal(pricing.hourlyRate, 2);
  assert.equal(pricing.baseTotal, 12);
  assert.equal(pricing.baseHours, 6);
});

test("calculatePricing rounds customer total up to nearest nickel", () => {
  // 1 hour at $35/day + $10 setup fee = 11.4583 subtotal, tax => 12.375...
  // Rounded up to the next 0.05 should be 12.40.
  const pricing = calculatePricing(1, 35, noExtras);
  assert.equal(pricing.total, 12.4);
  assert.equal(Number((pricing.total * 100) % 5), 0);
});
