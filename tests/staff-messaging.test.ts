import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMessageBody, nextBackoffMinutes } from "@/lib/messaging/service";
import { chooseOutboxDecision, isTransientNotificationError } from "@/lib/messaging/outbox-policy";

test("normalizeMessageBody trims and rejects invalid payloads", () => {
  assert.equal(normalizeMessageBody("  hello  "), "hello");
  assert.equal(normalizeMessageBody(""), null);
  assert.equal(normalizeMessageBody("   "), null);
  assert.equal(normalizeMessageBody(42), null);
  assert.equal(normalizeMessageBody("x".repeat(4001)), null);
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

test("retry policy marks non-transient failures as dead", () => {
  const permanent = { statusCode: 410 };
  assert.equal(isTransientNotificationError(permanent), false);
  assert.equal(chooseOutboxDecision(permanent, 1, 5), "dead");
});
