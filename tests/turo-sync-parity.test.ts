import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pickTuroCancellationMatch } from "../src/lib/utils/turo-cancellation-match";
import { isBlockedDateCancelled } from "../src/lib/utils/blocked-dates";

type FixtureRow = {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  cancelled_at?: string | null;
};

/** Mirrors turo-cancellation-sync.ts overlap filter + shared picker. */
function syncStyleMatch(
  rows: FixtureRow[],
  vehicleId: string,
  startDate: string,
  endDate: string,
  guestName: string | null
) {
  const overlapping = rows.filter(
    (r) =>
      !isBlockedDateCancelled(r) &&
      r.vehicle_id === vehicleId &&
      r.start_date <= endDate &&
      r.end_date >= startDate
  );
  return pickTuroCancellationMatch(overlapping, startDate, endDate, guestName);
}

/** Shared fixture rows for batch-sync parity scenarios. */
const BATCH_FIXTURE_ROWS: FixtureRow[] = [
  { id: "a", vehicle_id: "v1", start_date: "2026-06-01", end_date: "2026-06-03", reason: "Turo: Mario" },
  { id: "b", vehicle_id: "v1", start_date: "2026-06-02", end_date: "2026-06-04", reason: "Turo: Brent — $94.50" },
  { id: "c", vehicle_id: "v2", start_date: "2026-06-02", end_date: "2026-06-04", reason: "Turo: Brent — $94.50" },
  { id: "d", vehicle_id: "v1", start_date: "2026-06-10", end_date: "2026-06-12", reason: "Turo: Alex", cancelled_at: "2026-06-08T12:00:00Z" },
  { id: "e", vehicle_id: "v1", start_date: "2026-07-01", end_date: "2026-07-03", reason: "Turo: Sam" },
  { id: "f", vehicle_id: "v1", start_date: "2026-07-01", end_date: "2026-07-03", reason: "Turo: Pat" },
];

test("sync and webhook share pickTuroCancellationMatch for exact date rows", () => {
  const picked = syncStyleMatch(BATCH_FIXTURE_ROWS, "v1", "2026-06-02", "2026-06-04", "Brent");
  assert.equal(picked?.id, "b");
});

test("sync refuses wrong guest on overlapping Mario trip when cancelling Brent", () => {
  const rows = [
    { id: "c", vehicle_id: "v1", start_date: "2026-06-01", end_date: "2026-06-03", reason: "Turo: Mario" },
  ];
  const picked = syncStyleMatch(rows, "v1", "2026-06-02", "2026-06-04", "Brent");
  assert.equal(picked, null);
});

test("batch sync skips rows already marked cancelled_at", () => {
  const picked = syncStyleMatch(BATCH_FIXTURE_ROWS, "v1", "2026-06-10", "2026-06-12", "Alex");
  assert.equal(picked, null);
});

test("cancelled twin match detects previously cancelled trip for resurrection guard", () => {
  const cancelledRows = BATCH_FIXTURE_ROWS.filter((r) => r.cancelled_at);
  const picked = pickTuroCancellationMatch(
    cancelledRows,
    "2026-06-10",
    "2026-06-12",
    "Alex"
  );
  assert.equal(picked?.id, "d");
});

test("batch sync scopes match to vehicle_id", () => {
  const picked = syncStyleMatch(BATCH_FIXTURE_ROWS, "v1", "2026-06-02", "2026-06-04", "Brent");
  assert.equal(picked?.id, "b");
  assert.notEqual(picked?.id, "c");
});

test("batch sync matches guest on exact dates when only overlapping row exists", () => {
  const rows = [{ id: "m", vehicle_id: "v1", start_date: "2026-06-01", end_date: "2026-06-03", reason: "Turo: Mario" }];
  const picked = syncStyleMatch(rows, "v1", "2026-06-01", "2026-06-03", "Mario");
  assert.equal(picked?.id, "m");
});

test("batch sync disambiguates duplicate exact-date rows by guest name", () => {
  const picked = syncStyleMatch(BATCH_FIXTURE_ROWS, "v1", "2026-07-01", "2026-07-03", "Pat");
  assert.equal(picked?.id, "f");
});

test("turo webhook uses constant-time secret compare and replay guard", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/app/api/webhooks/turo-email/route.ts"),
    "utf8"
  );
  assert.ok(source.includes("safeCompareSecret"));
  assert.ok(source.includes("isWebhookReplay"));
  assert.ok(source.includes("isWebhookTimestampFresh"));
  assert.ok(source.includes("turoWebhookLimiter"));
  assert.ok(source.includes("explicitEventType"));
  assert.ok(source.includes("reconcile_refresh"));
});

test("webhook replay helper rejects stale timestamps", async () => {
  const { isWebhookTimestampFresh, isWebhookReplay } = await import(
    "../src/lib/security/webhook-replay"
  );
  const stale = Date.now() - 10 * 60 * 1000;
  assert.equal(isWebhookTimestampFresh(stale), false);
  assert.equal(isWebhookReplay("unique-key-test-1"), false);
  assert.equal(isWebhookReplay("unique-key-test-1"), true);
});
