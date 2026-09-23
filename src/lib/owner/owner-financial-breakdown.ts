import { isRevenueBooking } from "@/lib/owner/finance";
import { financingForMonth } from "@/lib/owner/owner-metrics";
import {
  listFinancingPayments,
  sumFinancingPaymentsToDate,
  type FinancedVehicle,
} from "@/lib/utils/financing";
import type { OwnerBooking, OwnerVehicle } from "@/lib/types";

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

export interface OwnerFinancialTotals {
  grossRevenue: number;
  processingFees: number;
  otherExpenses: number;
  netRevenue: number;
  platformFees: number;
  profit: number;
  financing: number;
  revenueAfterFinancing: number;
  bookingCount: number;
}

export interface OwnerVehicleFinancialRow extends OwnerFinancialTotals {
  vehicleId: string;
  vehicleName: string;
  ownerPercentage: number;
  isFinanced: boolean;
  monthlyPayment: number;
}

export interface OwnerMonthlyFinancialRow {
  month: string;
  monthKey: string;
  grossRevenue: number;
  profit: number;
  financing: number;
  revenueAfterFinancing: number;
}

export interface OwnerFinancialBreakdown {
  lifetime: OwnerFinancialTotals;
  currentMonth: OwnerFinancialTotals;
  byVehicle: OwnerVehicleFinancialRow[];
  monthly: OwnerMonthlyFinancialRow[];
}

function emptyTotals(): OwnerFinancialTotals {
  return {
    grossRevenue: 0,
    processingFees: 0,
    otherExpenses: 0,
    netRevenue: 0,
    platformFees: 0,
    profit: 0,
    financing: 0,
    revenueAfterFinancing: 0,
    bookingCount: 0,
  };
}

function addBooking(totals: OwnerFinancialTotals, booking: OwnerBooking) {
  totals.grossRevenue += booking.grossRevenue;
  totals.processingFees += booking.processingFees;
  totals.otherExpenses += booking.otherExpenses;
  totals.netRevenue += booking.netRevenue;
  totals.platformFees += booking.platformFees;
  totals.profit += booking.ownerPayout;
  totals.bookingCount += 1;
}

function finalizeTotals(
  totals: Omit<OwnerFinancialTotals, "financing" | "revenueAfterFinancing">,
  financing: number
): OwnerFinancialTotals {
  return {
    ...totals,
    grossRevenue: roundMoney(totals.grossRevenue),
    processingFees: roundMoney(totals.processingFees),
    otherExpenses: roundMoney(totals.otherExpenses),
    netRevenue: roundMoney(totals.netRevenue),
    platformFees: roundMoney(totals.platformFees),
    profit: roundMoney(totals.profit),
    financing: roundMoney(financing),
    revenueAfterFinancing: roundMoney(totals.grossRevenue - financing),
  };
}

function revenueBookings(bookings: OwnerBooking[]): OwnerBooking[] {
  return bookings.filter((b) => b.status !== "cancelled" && isRevenueBooking(b.rawStatus));
}

/** Full owner financial breakdown for admin detail views. */
export function computeOwnerFinancialBreakdown(
  bookings: OwnerBooking[],
  vehicles: OwnerVehicle[],
  now: Date = new Date()
): OwnerFinancialBreakdown {
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const financingLifetime = sumFinancingPaymentsToDate(vehicles.map(asFinancedVehicle), now);
  const financingThisMonth = financingForMonth(vehicles, currentMonthKey, now);

  const lifetime = emptyTotals();
  const currentMonth = emptyTotals();
  const vehicleMap = new Map<string, OwnerVehicleFinancialRow>();

  for (const vehicle of vehicles) {
    const financing = roundMoney(
      listFinancingPayments(asFinancedVehicle(vehicle), now).reduce((sum, payment) => sum + payment.amount, 0)
    );
    vehicleMap.set(vehicle.id, {
      vehicleId: vehicle.id,
      vehicleName: `${vehicle.year} ${vehicle.make} ${vehicle.model}`.trim(),
      ownerPercentage: vehicle.ownerPercentage,
      isFinanced: Boolean(vehicle.isFinanced),
      monthlyPayment: vehicle.monthlyPayment ?? 0,
      ...finalizeTotals(emptyTotals(), financing),
    });
  }

  for (const booking of revenueBookings(bookings)) {
    addBooking(lifetime, booking);
    if ((booking.pickupDate || "").slice(0, 7) === currentMonthKey) {
      addBooking(currentMonth, booking);
    }

    const vehicleRow = vehicleMap.get(booking.vehicleId);
    if (vehicleRow) addBooking(vehicleRow, booking);
  }

  const monthly: OwnerMonthlyFinancialRow[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthTotals = emptyTotals();
    for (const booking of revenueBookings(bookings)) {
      if ((booking.pickupDate || "").slice(0, 7) !== monthKey) continue;
      addBooking(monthTotals, booking);
    }
    const financing = financingForMonth(vehicles, monthKey, now);
    monthly.push({
      monthKey,
      month: d.toLocaleString("en-US", { month: "short", year: "2-digit" }),
      grossRevenue: roundMoney(monthTotals.grossRevenue),
      profit: roundMoney(monthTotals.profit),
      financing,
      revenueAfterFinancing: roundMoney(monthTotals.grossRevenue - financing),
    });
  }

  const byVehicle = Array.from(vehicleMap.values())
    .map((row) => {
      const { vehicleId, vehicleName, ownerPercentage, isFinanced, monthlyPayment, financing, ...rest } = row;
      return {
        vehicleId,
        vehicleName,
        ownerPercentage,
        isFinanced,
        monthlyPayment,
        ...finalizeTotals(rest, financing),
      };
    })
    .sort((a, b) => b.revenueAfterFinancing - a.revenueAfterFinancing);

  return {
    lifetime: finalizeTotals(lifetime, financingLifetime),
    currentMonth: finalizeTotals(currentMonth, financingThisMonth),
    byVehicle,
    monthly,
  };
}
