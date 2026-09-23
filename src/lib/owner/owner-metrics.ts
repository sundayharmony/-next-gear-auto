import { isRevenueBooking } from "@/lib/owner/finance";
import { formatYyyyMmDdLocal } from "@/lib/utils/booking-dates";
import {
  listFinancingPayments,
  sumFinancingPaymentsToDate,
  type FinancedVehicle,
} from "@/lib/utils/financing";
import type { OwnerBooking, OwnerDashboardMetrics, OwnerFinanceSummary, OwnerVehicle } from "@/lib/types";

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function asFinancedVehicle(vehicle: OwnerVehicle): FinancedVehicle {
  return {
    isFinanced: vehicle.isFinanced,
    monthlyPayment: vehicle.monthlyPayment,
    paymentDayOfMonth: vehicle.paymentDayOfMonth,
    financingStartDate: vehicle.financingStartDate || undefined,
    purchasePrice: vehicle.purchasePrice,
  };
}

/** Financing already due in one YYYY-MM, across the owner's vehicles. */
export function financingForMonth(
  vehicles: OwnerVehicle[],
  monthKey: string,
  asOf: Date = new Date()
): number {
  let total = 0;
  for (const vehicle of vehicles) {
    for (const payment of listFinancingPayments(asFinancedVehicle(vehicle), asOf)) {
      if (payment.date.slice(0, 7) === monthKey) total += payment.amount;
    }
  }
  return roundMoney(total);
}

export function computeOwnerFinanceSummary(
  bookings: OwnerBooking[],
  vehicles: OwnerVehicle[] = [],
  now: Date = new Date()
): OwnerFinanceSummary {
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const financingThisMonth = financingForMonth(vehicles, currentMonthKey, now);
  const financingLifetime = sumFinancingPaymentsToDate(vehicles.map(asFinancedVehicle), now);

  let currentMonthRevenue = 0;
  let currentMonthPayout = 0;
  let lifetimeRevenue = 0;
  let lifetimePayouts = 0;

  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    if (!isRevenueBooking(b.rawStatus)) continue;

    lifetimeRevenue += b.grossRevenue;
    // Payouts are no longer tracked. Every earning is treated as already paid.
    lifetimePayouts += b.ownerPayout;

    if ((b.pickupDate || "").slice(0, 7) === currentMonthKey) {
      currentMonthRevenue += b.grossRevenue;
      currentMonthPayout += b.ownerPayout;
    }
  }

  return {
    currentMonthRevenue: roundMoney(currentMonthRevenue - financingThisMonth),
    currentMonthPayout: roundMoney(currentMonthPayout),
    lifetimeRevenue: roundMoney(lifetimeRevenue - financingLifetime),
    lifetimePayouts: roundMoney(lifetimePayouts),
    pendingPayouts: 0,
    financingThisMonth,
    financingLifetime,
  };
}

/** Inclusive overlap (in days) between [aStart,aEnd] and [bStart,bEnd], YYYY-MM-DD. */
function overlapDays(aStart: string, aEnd: string, bStart: string, bEnd: string): number {
  const start = aStart > bStart ? aStart : bStart;
  const end = aEnd < bEnd ? aEnd : bEnd;
  if (end < start) return 0;
  const ms = Date.parse(`${end}T00:00:00`) - Date.parse(`${start}T00:00:00`);
  if (Number.isNaN(ms)) return 0;
  return Math.round(ms / 86_400_000) + 1;
}

export function computeOwnerDashboardMetrics(
  vehicles: OwnerVehicle[],
  bookings: OwnerBooking[],
  now: Date = new Date()
): OwnerDashboardMetrics {
  let totalRevenue = 0;
  let upcomingBookings = 0;
  let activeRentals = 0;
  let completedRentals = 0;
  let estimatedPayout = 0;
  let lifetimeEarnings = 0;

  const months: { key: string; month: string; revenue: number; payout: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      month: d.toLocaleString("en-US", { month: "short", year: "2-digit" }),
      revenue: 0,
      payout: 0,
    });
  }
  const monthIndex = new Map(months.map((m, i) => [m.key, i]));

  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    if (isRevenueBooking(b.rawStatus)) totalRevenue += b.grossRevenue;

    if (b.status === "upcoming") upcomingBookings += 1;
    else if (b.status === "active") activeRentals += 1;
    else if (b.status === "completed") completedRentals += 1;

    if (b.status === "upcoming" || b.status === "active") {
      estimatedPayout += b.ownerPayout;
    }
    if (isRevenueBooking(b.rawStatus)) {
      lifetimeEarnings += b.ownerPayout;
    }

    const mk = (b.pickupDate || "").slice(0, 7);
    const idx = monthIndex.get(mk);
    if (idx !== undefined) {
      months[idx].revenue += b.grossRevenue;
      months[idx].payout += b.ownerPayout;
    }
  }

  const vehicleFinancing = sumFinancingPaymentsToDate(vehicles.map(asFinancedVehicle), now);
  totalRevenue -= vehicleFinancing;
  for (const month of months) {
    month.revenue -= financingForMonth(vehicles, month.key, now);
  }

  const windowEnd = formatYyyyMmDdLocal(now);
  const windowStartDate = new Date(now);
  windowStartDate.setDate(windowStartDate.getDate() - 29);
  const windowStart = formatYyyyMmDdLocal(windowStartDate);
  let bookedDays = 0;
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    bookedDays += overlapDays(b.pickupDate, b.returnDate, windowStart, windowEnd);
  }
  const capacity = vehicles.length * 30;
  const utilizationRate =
    capacity > 0 ? Math.min(100, Math.round((bookedDays / capacity) * 1000) / 10) : 0;

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    upcomingBookings,
    activeRentals,
    completedRentals,
    estimatedPayout: Math.round(estimatedPayout * 100) / 100,
    pendingPayouts: 0,
    vehicleFinancing,
    lifetimeEarnings: Math.round(lifetimeEarnings * 100) / 100,
    utilizationRate,
    vehicleCount: vehicles.length,
    monthlyRevenue: months.map((m) => ({
      month: m.month,
      revenue: Math.round(m.revenue * 100) / 100,
      payout: Math.round(m.payout * 100) / 100,
    })),
  };
}
