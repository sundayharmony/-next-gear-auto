import test from "node:test";
import assert from "node:assert/strict";
import { pickTuroCancellationMatch } from "../src/lib/utils/turo-cancellation-match";

/** Mirrors turo-cancellation-sync.ts overlap filter + shared picker. */
function syncStyleMatch(
  rows: Array<{ id: string; vehicle_id: string; start_date: string; end_date: string; reason: string | null }>,
  vehicleId: string,
  startDate: string,
  endDate: string,
  guestName: string | null
) {
  const overlapping = rows.filter(
    (r) =>
      r.vehicle_id === vehicleId &&
      r.start_date <= endDate &&
      r.end_date >= startDate
  );
  return pickTuroCancellationMatch(overlapping, startDate, endDate, guestName);
}

test("sync and webhook share pickTuroCancellationMatch for exact date rows", () => {
  const rows = [
    { id: "a", vehicle_id: "v1", start_date: "2026-06-01", end_date: "2026-06-03", reason: "Turo: Mario" },
    { id: "b", vehicle_id: "v1", start_date: "2026-06-02", end_date: "2026-06-04", reason: "Turo: Brent — $94.50" },
  ];
  const picked = syncStyleMatch(rows, "v1", "2026-06-02", "2026-06-04", "Brent");
  assert.equal(picked?.id, "b");
});

test("sync refuses wrong guest on overlapping Mario trip when cancelling Brent", () => {
  const rows = [
    { id: "c", vehicle_id: "v1", start_date: "2026-06-01", end_date: "2026-06-03", reason: "Turo: Mario" },
  ];
  const picked = syncStyleMatch(rows, "v1", "2026-06-02", "2026-06-04", "Brent");
  assert.equal(picked, null);
});
