import test from "node:test";
import assert from "node:assert/strict";
import {
  canTransitionStatus,
  getAllowedTransitions,
  validateBookingStatusPatch,
  validateConfirmRequiresAgreement,
  validateStatusTransition,
} from "@/lib/bookings/lifecycle";

test("pending may become confirmed or cancelled", () => {
  assert.deepEqual(getAllowedTransitions("pending"), ["confirmed", "cancelled"]);
  assert.equal(canTransitionStatus("pending", "confirmed"), true);
  assert.equal(canTransitionStatus("pending", "active"), false);
});

test("confirmed may move to no-show", () => {
  assert.equal(canTransitionStatus("confirmed", "no-show"), true);
  assert.equal(canTransitionStatus("pending", "no-show"), false);
});

test("completed is terminal", () => {
  assert.deepEqual(getAllowedTransitions("completed"), []);
  assert.equal(canTransitionStatus("completed", "active"), false);
});

test("validateStatusTransition rejects illegal jumps", () => {
  const bad = validateStatusTransition("pending", "active");
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.ok(bad.message.includes("Cannot transition"));

  const noop = validateStatusTransition("confirmed", "confirmed");
  assert.equal(noop.ok, true);
});

test("validateBookingStatusPatch combines transition and agreement", () => {
  const bad = validateBookingStatusPatch({
    currentStatus: "pending",
    newStatus: "confirmed",
    agreementSignedAt: null,
  });
  assert.equal(bad.ok, false);

  const ok = validateBookingStatusPatch({
    currentStatus: "pending",
    newStatus: "confirmed",
    agreementSignedAt: "2026-01-01T00:00:00Z",
  });
  assert.equal(ok.ok, true);
});

test("confirm requires signed agreement when pending → confirmed", () => {
  const blocked = validateConfirmRequiresAgreement({
    currentStatus: "pending",
    newStatus: "confirmed",
    agreementSignedAt: null,
  });
  assert.equal(blocked.ok, false);

  const ok = validateConfirmRequiresAgreement({
    currentStatus: "pending",
    newStatus: "confirmed",
    agreementSignedAt: "2026-01-01T00:00:00Z",
  });
  assert.equal(ok.ok, true);
});

test("confirm rule does not apply when already confirmed", () => {
  const ok = validateConfirmRequiresAgreement({
    currentStatus: "confirmed",
    newStatus: "active",
    agreementSignedAt: null,
  });
  assert.equal(ok.ok, true);
});
