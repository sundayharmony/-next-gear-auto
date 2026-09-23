import test from "node:test";
import assert from "node:assert/strict";
import { computeOwnerFinancialBreakdown } from "../src/lib/owner/owner-financial-breakdown";
import type { OwnerBooking, OwnerVehicle } from "../src/lib/types";

const AS_OF = new Date(2026, 8, 22);

function booking(partial: Partial<OwnerBooking> = {}): OwnerBooking {
  return {
    id: "b1",
    vehicleId: "v1",
    vehicleName: "2024 Honda Civic",
    customerName: "Guest",
    pickupDate: "2026-09-02",
    returnDate: "2026-09-04",
    rentalDays: 3,
    status: "completed",
    rawStatus: "completed",
    payoutStatus: "paid",
    payoutDate: null,
    createdAt: "2026-09-02",
    grossRevenue: 1000,
    processingFees: 30,
    otherExpenses: 20,
    netRevenue: 950,
    platformFees: 285,
    ownerPercentage: 70,
    ownerPayout: 665,
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

test("financial breakdown totals gross revenue, fees, profit, and financing", () => {
  const financed = vehicle({
    isFinanced: true,
    monthlyPayment: 400,
    paymentDayOfMonth: 1,
    financingStartDate: "2026-09-01",
    purchasePrice: 20000,
  });
  const breakdown = computeOwnerFinancialBreakdown([booking()], [financed], AS_OF);

  assert.equal(breakdown.lifetime.grossRevenue, 1000);
  assert.equal(breakdown.lifetime.processingFees, 30);
  assert.equal(breakdown.lifetime.otherExpenses, 20);
  assert.equal(breakdown.lifetime.netRevenue, 950);
  assert.equal(breakdown.lifetime.platformFees, 285);
  assert.equal(breakdown.lifetime.profit, 665);
  assert.equal(breakdown.lifetime.financing, 400);
  assert.equal(breakdown.lifetime.revenueAfterFinancing, 600);
  assert.equal(breakdown.currentMonth.revenueAfterFinancing, 600);
  assert.equal(breakdown.byVehicle[0].profit, 665);
  assert.equal(breakdown.monthly.at(-1)?.revenueAfterFinancing, 600);
});

test("financial breakdown ignores cancelled bookings", () => {
  const breakdown = computeOwnerFinancialBreakdown(
    [booking({ status: "cancelled", rawStatus: "cancelled", grossRevenue: 0, ownerPayout: 0 })],
    [vehicle()],
    AS_OF
  );
  assert.equal(breakdown.lifetime.bookingCount, 0);
  assert.equal(breakdown.lifetime.profit, 0);
});
