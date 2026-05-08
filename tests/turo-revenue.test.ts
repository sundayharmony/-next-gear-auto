import test from "node:test";
import assert from "node:assert/strict";
import { resolveTuroTripRevenue } from "@/lib/utils/turo-blocked-date";

test("resolveTuroTripRevenue prefers earnings column", () => {
  assert.equal(resolveTuroTripRevenue({ earnings: 199.5, reason: "Turo: X — $1.00" }), 199.5);
});

test("resolveTuroTripRevenue parses last dollar amount from reason", () => {
  assert.equal(
    resolveTuroTripRevenue({ earnings: null, reason: "Turo: Alex — $50.00 and note $100.25" }),
    100.25
  );
});

test("resolveTuroTripRevenue returns 0 when nothing parseable", () => {
  assert.equal(resolveTuroTripRevenue({ earnings: 0, reason: "no money here" }), 0);
});
