import test from "node:test";
import assert from "node:assert/strict";
import {
  attributeRevenueToWeek,
  computeOwnerWeekSettlement,
  computeVehicleWeekSettlement,
  getWeekRange,
  normalizeWeekStart,
  overlappingDays,
  prorateMonthlyInsurance,
  sumOwnerWeekSettlements,
} from "@/lib/owner/weekly-settlement";

test("getWeekRange returns Monday–Sunday containing the anchor", () => {
  // 2026-11-11 is Wednesday
  const { weekStart, weekEnd } = getWeekRange("2026-11-11");
  assert.equal(weekStart, "2026-11-09");
  assert.equal(weekEnd, "2026-11-15");
});

test("normalizeWeekStart snaps mid-week dates to Monday", () => {
  assert.equal(normalizeWeekStart("2026-11-15"), "2026-11-09");
  assert.equal(normalizeWeekStart("2026-11-09"), "2026-11-09");
});

test("prorateMonthlyInsurance uses days-in-month for a full week in one month", () => {
  // Nov 2026 has 30 days; week Nov 9–15 = 7 days
  const share = prorateMonthlyInsurance(300, "2026-11-09", "2026-11-15");
  assert.equal(share, Math.round((300 / 30) * 7 * 100) / 100);
});

test("prorateMonthlyInsurance handles a week spanning two months", () => {
  // Week containing 2026-11-30 (Mon Nov 30 – Sun Dec 6)
  const { weekStart, weekEnd } = getWeekRange("2026-11-30");
  assert.equal(weekStart, "2026-11-30");
  assert.equal(weekEnd, "2026-12-06");
  // 1 day in Nov (30 days) + 6 days in Dec (31 days)
  const expected = Math.round((400 / 30 + (400 / 31) * 6) * 100) / 100;
  assert.equal(prorateMonthlyInsurance(400, weekStart, weekEnd), expected);
});

test("overlappingDays and attributeRevenueToWeek prorate by rental days", () => {
  assert.equal(overlappingDays("2026-11-08", "2026-11-12", "2026-11-09", "2026-11-15"), 4);
  // 5 rental days total, 4 overlap → 80% of $100
  assert.equal(
    attributeRevenueToWeek(100, "2026-11-08", "2026-11-12", "2026-11-09", "2026-11-15"),
    80,
  );
});

test("vehicle settlement applies insurance then 25/75 split", () => {
  const vehicle = computeVehicleWeekSettlement({
    vehicleId: "v1",
    vehicleName: "2024 BMW X5",
    ownerId: "o1",
    monthlyInsurance: 310, // Nov has 30 days → 7/30 * 310 = 72.333 → 72.33
    weekStart: "2026-11-09",
    weekEnd: "2026-11-15",
    trips: [
      {
        id: "bk1",
        kind: "booking",
        customerName: "Alex",
        pickupDate: "2026-11-09",
        returnDate: "2026-11-15",
        grossTotal: 700,
      },
    ],
  });

  assert.equal(vehicle.grossWeek, 700);
  assert.equal(vehicle.insuranceWeek, Math.round((310 / 30) * 7 * 100) / 100);
  assert.equal(vehicle.net, Math.round((700 - vehicle.insuranceWeek) * 100) / 100);
  assert.equal(vehicle.platformFee, Math.round(vehicle.net * 0.25 * 100) / 100);
  assert.equal(vehicle.ownerPayout, Math.round((vehicle.net - vehicle.platformFee) * 100) / 100);
});

test("zero insurance yields 75% of gross to owner", () => {
  const vehicle = computeVehicleWeekSettlement({
    vehicleId: "v1",
    vehicleName: "Car",
    ownerId: "o1",
    monthlyInsurance: 0,
    weekStart: "2026-11-09",
    weekEnd: "2026-11-15",
    trips: [
      {
        id: "bk1",
        kind: "booking",
        customerName: "Alex",
        pickupDate: "2026-11-10",
        returnDate: "2026-11-12",
        grossTotal: 200,
      },
    ],
  });
  assert.equal(vehicle.insuranceWeek, 0);
  assert.equal(vehicle.net, 200);
  assert.equal(vehicle.platformFee, 50);
  assert.equal(vehicle.ownerPayout, 150);
});

test("multi-vehicle owner rolls up settlements", () => {
  const v1 = computeVehicleWeekSettlement({
    vehicleId: "v1",
    vehicleName: "A",
    ownerId: "o1",
    monthlyInsurance: 0,
    weekStart: "2026-11-09",
    weekEnd: "2026-11-15",
    trips: [
      {
        id: "bk1",
        kind: "booking",
        customerName: "A",
        pickupDate: "2026-11-09",
        returnDate: "2026-11-09",
        grossTotal: 100,
      },
    ],
  });
  const v2 = computeVehicleWeekSettlement({
    vehicleId: "v2",
    vehicleName: "B",
    ownerId: "o1",
    monthlyInsurance: 0,
    weekStart: "2026-11-09",
    weekEnd: "2026-11-15",
    trips: [
      {
        id: "bk2",
        kind: "turo",
        customerName: "B",
        pickupDate: "2026-11-09",
        returnDate: "2026-11-09",
        grossTotal: 300,
      },
    ],
  });
  const owner = computeOwnerWeekSettlement({
    ownerId: "o1",
    ownerName: "Mac",
    ownerEmail: "mac@example.com",
    vehicles: [v1, v2],
  });
  assert.equal(owner.grossWeek, 400);
  assert.equal(owner.platformFee, 100);
  assert.equal(owner.ownerPayout, 300);

  const totals = sumOwnerWeekSettlements([owner]);
  assert.equal(totals.ownerPayout, 300);
});
