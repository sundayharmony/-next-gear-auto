import test from "node:test";
import assert from "node:assert/strict";
import {
  publicPickupInstant,
  publicPickupMeetsMinimumAdvance,
} from "../src/lib/booking/public-booking-guards";

test("public pickup is interpreted in America/New_York", () => {
  assert.equal(
    publicPickupInstant("2026-07-17", "11:00")?.toISOString(),
    "2026-07-17T15:00:00.000Z",
  );
});

test("public checkout rejects Kashif's roughly two-hour lead time", () => {
  const createdAt = new Date("2026-07-17T12:54:33.941Z");
  assert.equal(
    publicPickupMeetsMinimumAdvance("2026-07-17", "11:00", createdAt),
    false,
  );
});

test("public checkout accepts pickup at exactly 24 hours", () => {
  const now = new Date("2026-07-17T13:00:00.000Z");
  assert.equal(
    publicPickupMeetsMinimumAdvance("2026-07-18", "09:00", now),
    true,
  );
});
