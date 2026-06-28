import test from "node:test";
import assert from "node:assert/strict";
import { dedupeActiveTuroRows } from "@/lib/admin/turo-blocked-fetch";

test("dedupeActiveTuroRows keeps newest row per vehicle guest and dates", () => {
  const rows = dedupeActiveTuroRows([
    {
      id: "old",
      vehicle_id: "v1",
      start_date: "2026-06-26",
      end_date: "2026-06-28",
      reason: "Turo: Runzhuo — $118.3",
      created_at: "2026-06-01T00:00:00Z",
      cancelled_at: null,
    },
    {
      id: "new",
      vehicle_id: "v1",
      start_date: "2026-06-26",
      end_date: "2026-06-28",
      reason: "Turo: Runzhuo — $118.3",
      created_at: "2026-06-20T00:00:00Z",
      cancelled_at: null,
    },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "new");
});

test("dedupeActiveTuroRows drops cancelled rows and reason prefix", () => {
  const rows = dedupeActiveTuroRows([
    {
      id: "cancelled",
      vehicle_id: "v1",
      start_date: "2026-06-26",
      end_date: "2026-06-28",
      reason: "[CANCELLED] Turo: Runzhuo",
      created_at: "2026-06-20T00:00:00Z",
      cancelled_at: null,
    },
    {
      id: "active",
      vehicle_id: "v2",
      start_date: "2026-06-27",
      end_date: "2026-06-29",
      reason: "Turo: Juneanne — $126",
      created_at: "2026-06-20T00:00:00Z",
      cancelled_at: null,
    },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "active");
});
