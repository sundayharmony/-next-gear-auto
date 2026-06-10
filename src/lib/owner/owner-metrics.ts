import { isRevenueBooking } from "@/lib/owner/finance";
import { formatYyyyMmDdLocal } from "@/lib/utils/booking-dates";
import type { OwnerBooking, OwnerDashboardMetrics, OwnerVehicle } from "@/lib/types";

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
  bookings: OwnerBooking[]
): OwnerDashboardMetrics {
  let totalRevenue = 0;
  let upcomingBookings = 0;
  let activeRentals = 0;
  let completedRentals = 0;
  let estimatedPayout = 0;
  let pendingPayouts = 0;
  let lifetimeEarnings = 0;

  const now = new Date();
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
    if (b.payoutStatus === "paid") {
      lifetimeEarnings += b.ownerPayout;
    } else if (b.status === "completed") {
      pendingPayouts += b.ownerPayout;
    }

    const mk = (b.pickupDate || "").slice(0, 7);
    const idx = monthIndex.get(mk);
    if (idx !== undefined) {
      months[idx].revenue += b.grossRevenue;
      months[idx].payout += b.ownerPayout;
    }
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
    pendingPayouts: Math.round(pendingPayouts * 100) / 100,
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
