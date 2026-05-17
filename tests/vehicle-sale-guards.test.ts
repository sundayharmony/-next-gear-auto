import test from "node:test";
import assert from "node:assert/strict";
import { hasBlockingBookingsForSale, SALE_BLOCKING_STATUSES } from "@/lib/vehicle-sale/guards";

test("SALE_BLOCKING_STATUSES includes operational rentals", () => {
  assert.deepEqual(SALE_BLOCKING_STATUSES, ["pending", "confirmed", "active"]);
});

test("hasBlockingBookingsForSale blocks active booking with future return", () => {
  const blocked = hasBlockingBookingsForSale(
    [{ id: "b1", status: "active", return_date: "2099-01-01" }],
    "2026-05-16",
  );
  assert.equal(blocked, true);
});

test("hasBlockingBookingsForSale ignores completed bookings", () => {
  const blocked = hasBlockingBookingsForSale(
    [{ id: "b1", status: "completed", return_date: "2099-01-01" }],
    "2026-05-16",
  );
  assert.equal(blocked, false);
});

test("hasBlockingBookingsForSale ignores active booking that already ended", () => {
  const blocked = hasBlockingBookingsForSale(
    [{ id: "b1", status: "active", return_date: "2020-01-01" }],
    "2026-05-16",
  );
  assert.equal(blocked, false);
});
