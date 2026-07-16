import test from "node:test";
import assert from "node:assert/strict";
import { getTuroDriverFromReason, formatTuroOccupancyCustomerName, formatTuroReasonForDisplay, isTuroTripSyncMutable, mergeTuroLocationField } from "../src/lib/utils/turo-blocked-date";

test("getTuroDriverFromReason parses standard Turo reason", () => {
  assert.equal(getTuroDriverFromReason("Turo: Noah — $158.19"), "Noah");
});

test("getTuroDriverFromReason parses extended Turo reason", () => {
  assert.equal(getTuroDriverFromReason("Turo (extended): Noah — $158.19"), "Noah");
});

test("getTuroDriverFromReason returns null for manual reasons", () => {
  assert.equal(getTuroDriverFromReason("Personal use"), null);
});

test("formatTuroReasonForDisplay strips dollar amounts when hideMoney", () => {
  assert.equal(
    formatTuroReasonForDisplay("Turo: James — $248.55", { hideMoney: true }),
    "Turo: James"
  );
  assert.equal(
    formatTuroReasonForDisplay("Turo: James — $248.55", { hideMoney: false }),
    "Turo: James — $248.55"
  );
});

test("formatTuroOccupancyCustomerName prefers guest over vehicle label", () => {
  assert.equal(
    formatTuroOccupancyCustomerName("Turo: Chevon — $127.4", "2024 JEEP Grand Cherokee"),
    "Chevon (Turo)"
  );
  assert.equal(
    formatTuroOccupancyCustomerName(null, "2024 JEEP Grand Cherokee"),
    "2024 JEEP Grand Cherokee on TURO"
  );
});

test("mergeTuroLocationField fills missing location from parsed email", () => {
  assert.equal(
    mergeTuroLocationField(null, "Newark Liberty International Airport"),
    "Newark Liberty International Airport"
  );
});

test("mergeTuroLocationField clears junk stored location", () => {
  assert.equal(
    mergeTuroLocationField("service by chance? Reply https://turo.com", null),
    null
  );
});

test("mergeTuroLocationField does not overwrite valid location unless forceRefresh", () => {
  assert.equal(
    mergeTuroLocationField("Newark Liberty International Airport", "Hoboken, NJ"),
    undefined
  );
  assert.equal(
    mergeTuroLocationField("Newark Liberty International Airport", "Hoboken, NJ", {
      forceRefresh: true,
    }),
    "Hoboken, NJ"
  );
});

test("isTuroTripSyncMutable allows today and future trips only", () => {
  assert.equal(isTuroTripSyncMutable("2026-07-06", "2026-07-06"), true);
  assert.equal(isTuroTripSyncMutable("2026-07-07", "2026-07-06"), true);
  assert.equal(isTuroTripSyncMutable("2026-07-05", "2026-07-06"), false);
});
