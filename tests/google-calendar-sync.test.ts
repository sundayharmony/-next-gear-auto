import test from "node:test";
import assert from "node:assert/strict";
import { formatReconcileSummary } from "../src/lib/integrations/google-calendar/reconcile-result";

test("formatReconcileSummary reports counts without errors", () => {
  assert.equal(
    formatReconcileSummary({ upserted: 3, deleted: 1, skipped: 10, errors: [] }),
    "Sync complete — 3 updated, 1 removed, 10 unchanged"
  );
});

test("formatReconcileSummary includes failed item preview", () => {
  const message = formatReconcileSummary({
    upserted: 2,
    deleted: 0,
    skipped: 5,
    errors: ["booking:b1: Rate Limit Exceeded", "turo:t9: Invalid start time"],
  });
  assert.match(message, /2 updated/);
  assert.match(message, /2 item\(s\) failed/);
  assert.match(message, /booking:b1/);
});
