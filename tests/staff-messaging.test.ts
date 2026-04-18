import test from "node:test";
import assert from "node:assert/strict";
import {
  formatStaffDisplayName,
  normalizeMessageBody,
  nextBackoffMinutes,
  orderedDmPair,
} from "@/lib/messaging/service";
import {
  chooseOutboxDecision,
  isPermanentNotificationError,
  isTransientNotificationError,
} from "@/lib/messaging/outbox-policy";

test("normalizeMessageBody trims and rejects invalid payloads", () => {
  assert.equal(normalizeMessageBody("  hello  "), "hello");
  assert.equal(normalizeMessageBody(""), null);
  assert.equal(normalizeMessageBody("   "), null);
  assert.equal(normalizeMessageBody(42), null);
  assert.equal(normalizeMessageBody("x".repeat(4001)), null);
});

test("orderedDmPair is stable lexicographic ordering", () => {
  assert.deepEqual(orderedDmPair("b", "a"), ["a", "b"]);
  assert.deepEqual(orderedDmPair("a", "b"), ["a", "b"]);
});

test("formatStaffDisplayName prefers name then email then id", () => {
  assert.equal(
    formatStaffDisplayName({ id: "u1", role: "admin", name: "  Pat  ", email: "p@x.com" }),
    "Pat"
  );
  assert.equal(
    formatStaffDisplayName({ id: "u1", role: "manager", name: "", email: " m@y.com " }),
    "m@y.com"
  );
  assert.equal(formatStaffDisplayName({ id: "u1", role: "admin", name: "", email: "" }), "u1");
});

test("backoff escalates across attempts", () => {
  assert.equal(nextBackoffMinutes(1), 1);
  assert.equal(nextBackoffMinutes(2), 3);
  assert.equal(nextBackoffMinutes(3), 10);
  assert.equal(nextBackoffMinutes(8), 30);
});

test("retry policy retries transient failures before max attempts", () => {
  const transient = { code: "ETIMEDOUT" };
  assert.equal(isTransientNotificationError(transient), true);
  assert.equal(chooseOutboxDecision(transient, 1, 5), "retry");
  assert.equal(chooseOutboxDecision(transient, 5, 5), "dead");
});

test("retry policy marks permanent failures as dead immediately", () => {
  const permanent = { statusCode: 410 };
  assert.equal(isPermanentNotificationError(permanent), true);
  assert.equal(isTransientNotificationError(permanent), false);
  assert.equal(chooseOutboxDecision(permanent, 1, 5), "dead");
});

test("retry policy retries typical nodemailer failures until max attempts", () => {
  const smtpFlaky = { message: "Connection closed unexpectedly" };
  assert.equal(isPermanentNotificationError(smtpFlaky), false);
  assert.equal(chooseOutboxDecision(smtpFlaky, 1, 5), "retry");
  assert.equal(chooseOutboxDecision(smtpFlaky, 5, 5), "dead");
});

test("SMTP authentication failure is permanent", () => {
  const authFail = { responseCode: 535 };
  assert.equal(chooseOutboxDecision(authFail, 1, 5), "dead");
});
