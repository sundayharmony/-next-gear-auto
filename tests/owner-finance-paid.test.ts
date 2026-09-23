import test from "node:test";
import assert from "node:assert/strict";
import {
  computeOwnerDashboardMetrics,
  computeOwnerFinanceSummary,
} from "../src/lib/owner/owner-metrics";
import { listFinancingPayments } from "../src/lib/utils/financing";
import type { OwnerBooking, OwnerVehicle } from "../src/lib/types";

const AS_OF = new Date(2026, 8, 22);

function booking(partial: Partial<OwnerBooking> = {}): OwnerBooking {
  return {
    id: "b1",
    vehicleId: "v1",
    vehicleName: "Car",
    customerName: "Guest",
    pickupDate: "2026-09-02",
    returnDate: "2026-09-04",
    rentalDays: 3,
    status: "completed",
    rawStatus: "completed",
    payoutStatus: "pending",
    payoutDate: null,
    createdAt: "2026-09-02",
    grossRevenue: 1000,
    processingFees: 0,
    otherExpenses: 0,
    netRevenue: 1000,
    platformFees: 300,
    ownerPercentage: 70,
    ownerPayout: 700,
    ...partial,
  };
}

function vehicle(partial: Partial<OwnerVehicle> = {}): OwnerVehicle {
  return {
    id: "v1",
    year: 2024,
    make: "Honda",
    model: "Civic",
    category: "sedan",
    image: null,
    dailyRate: 80,
    ownerPercentage: 70,
    isAvailable: true,
    ...partial,
  };
}

test("owner earnings are treated as paid even when a payout was still pending", () => {
  const summary = computeOwnerFinanceSummary([booking()], [], AS_OF);
  assert.equal(summary.pendingPayouts, 0);
  assert.equal(summary.lifetimePayouts, 700);
  assert.equal(summary.lifetimeRevenue, 1000);
  assert.equal(summary.financingThisMonth, 0);
});

test("a financed vehicle's monthly payment is subtracted from that vehicle's revenue", () => {
  const financed = vehicle({
    isFinanced: true,
    monthlyPayment: 400,
    paymentDayOfMonth: 1,
    financingStartDate: "2026-09-01",
    purchasePrice: 20000,
  });
  const payments = listFinancingPayments(financed, AS_OF);
  assert.deepEqual(
    payments.filter((payment) => payment.date.startsWith("2026-09")),
    [{ date: "2026-09-01", amount: 400 }]
  );

  const summary = computeOwnerFinanceSummary([booking()], [financed], AS_OF);
  assert.equal(summary.financingThisMonth, 400);
  assert.equal(summary.financingLifetime, 400);
  assert.equal(summary.currentMonthRevenue, 600);
  assert.equal(summary.lifetimeRevenue, 600);
  assert.equal(summary.pendingPayouts, 0);
  assert.equal(summary.lifetimePayouts, 700);

  const metrics = computeOwnerDashboardMetrics([financed], [booking()], AS_OF);
  assert.equal(metrics.pendingPayouts, 0);
  assert.equal(metrics.vehicleFinancing, 400);
  assert.equal(metrics.totalRevenue, 600);
  assert.equal(metrics.lifetimeEarnings, 700);
  const september = metrics.monthlyRevenue.find((month) => month.month.startsWith("Sep"));
  assert.ok(september);
  assert.equal(september.revenue, 600);
});
