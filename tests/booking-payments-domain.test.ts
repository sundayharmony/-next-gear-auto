import test from "node:test";
import assert from "node:assert/strict";
import { sumBookingPaymentAmounts } from "@/lib/bookings/payments";

test("sumBookingPaymentAmounts sums rows", () => {
  assert.equal(sumBookingPaymentAmounts([{ amount: 10 }, { amount: 2.5 }, { amount: null }]), 12.5);
  assert.equal(sumBookingPaymentAmounts([]), 0);
});
