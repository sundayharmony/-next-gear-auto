import test from "node:test";
import assert from "node:assert/strict";
import {
  deriveTuroOccupancyStatus,
  sortOccupancyEntries,
  type OccupancyEntry,
} from "@/lib/admin/vehicle-occupancy";

test("deriveTuroOccupancyStatus: cancelled trip returns cancelled", () => {
  assert.equal(
    deriveTuroOccupancyStatus("2026-12-01", "2026-12-10", "2026-06-01", {
      cancelled_at: "2026-06-02T00:00:00Z",
    }),
    "cancelled"
  );
});

test("deriveTuroOccupancyStatus: [CANCELLED] reason prefix returns cancelled", () => {
  assert.equal(
    deriveTuroOccupancyStatus("2026-12-01", "2026-12-10", "2026-06-01", {
      reason: "[CANCELLED] 2026-06-02 — Turo: Guest",
    }),
    "cancelled"
  );
});

test("deriveTuroOccupancyStatus: past trip is completed", () => {
  assert.equal(deriveTuroOccupancyStatus("2026-01-01", "2026-01-05", "2026-06-01"), "completed");
});

test("deriveTuroOccupancyStatus: future trip is confirmed", () => {
  assert.equal(deriveTuroOccupancyStatus("2026-12-01", "2026-12-10", "2026-06-01"), "confirmed");
});

test("deriveTuroOccupancyStatus: day before pickup is confirmed", () => {
  assert.equal(deriveTuroOccupancyStatus("2026-06-17", "2026-06-20", "2026-06-16"), "confirmed");
});

test("deriveTuroOccupancyStatus: today inside range is active", () => {
  assert.equal(deriveTuroOccupancyStatus("2026-06-01", "2026-06-30", "2026-06-15"), "active");
});

test("deriveTuroOccupancyStatus: pickup day before pickup time is confirmed", () => {
  const beforePickup = new Date(2026, 5, 17, 10, 0, 0);
  assert.equal(
    deriveTuroOccupancyStatus("2026-06-17", "2026-06-20", "2026-06-17", undefined, {
      pickup_time: "11:00",
      now: beforePickup,
    }),
    "confirmed"
  );
});

test("deriveTuroOccupancyStatus: pickup day after pickup time is active", () => {
  const afterPickup = new Date(2026, 5, 17, 12, 0, 0);
  assert.equal(
    deriveTuroOccupancyStatus("2026-06-17", "2026-06-20", "2026-06-17", undefined, {
      pickup_time: "11:00",
      now: afterPickup,
    }),
    "active"
  );
});

test("deriveTuroOccupancyStatus: return day after return time is completed", () => {
  const afterReturn = new Date(2026, 5, 20, 18, 0, 0);
  assert.equal(
    deriveTuroOccupancyStatus("2026-06-17", "2026-06-20", "2026-06-20", undefined, {
      return_time: "17:00",
      now: afterReturn,
    }),
    "completed"
  );
});

test("sortOccupancyEntries sorts by pickup_date desc by default column", () => {
  const rows: OccupancyEntry[] = [
    {
      id: "a",
      kind: "booking",
      vehicle_id: "v1",
      vehicleName: "Car",
      customer_name: "A",
      pickup_date: "2026-03-01",
      return_date: "2026-03-05",
      pickup_time: null,
      return_time: null,
      status: "completed",
      total_price: 1,
      deposit: null,
      earnings: null,
      origin_channel: "public_checkout",
      source: "booking",
      canViewPricing: true,
      canManage: true,
      created_at: "2026-01-01",
    },
    {
      id: "b",
      kind: "turo",
      vehicle_id: "v1",
      vehicleName: "Car",
      customer_name: "B",
      pickup_date: "2026-04-01",
      return_date: "2026-04-03",
      pickup_time: null,
      return_time: null,
      status: "confirmed",
      total_price: 2,
      deposit: null,
      earnings: 2,
      origin_channel: "turo",
      source: "turo-email",
      canViewPricing: true,
      canManage: false,
      created_at: "2026-01-02",
    },
  ];
  const sorted = sortOccupancyEntries(rows, "pickup_date", false);
  assert.equal(sorted[0].id, "b");
  assert.equal(sorted[1].id, "a");
});
