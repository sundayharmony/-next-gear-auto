import test from "node:test";
import assert from "node:assert/strict";
import { getTuroDriverFromReason } from "../src/lib/utils/turo-blocked-date";

test("getTuroDriverFromReason parses standard Turo reason", () => {
  assert.equal(getTuroDriverFromReason("Turo: Noah — $158.19"), "Noah");
});

test("getTuroDriverFromReason parses extended Turo reason", () => {
  assert.equal(getTuroDriverFromReason("Turo (extended): Noah — $158.19"), "Noah");
});

test("getTuroDriverFromReason returns null for manual reasons", () => {
  assert.equal(getTuroDriverFromReason("Personal use"), null);
});
