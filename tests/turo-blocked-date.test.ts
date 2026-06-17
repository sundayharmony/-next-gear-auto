import test from "node:test";
import assert from "node:assert/strict";
import { getTuroDriverFromReason, formatTuroOccupancyCustomerName } from "../src/lib/utils/turo-blocked-date";

test("getTuroDriverFromReason parses standard Turo reason", () => {
  assert.equal(getTuroDriverFromReason("Turo: Noah — $158.19"), "Noah");
});

test("getTuroDriverFromReason parses extended Turo reason", () => {
  assert.equal(getTuroDriverFromReason("Turo (extended): Noah — $158.19"), "Noah");
});

test("getTuroDriverFromReason returns null for manual reasons", () => {
  assert.equal(getTuroDriverFromReason("Personal use"), null);
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
