/**
 * Vehicle Financing Calculator
 *
 * Calculates how many monthly payments have been processed for a financed vehicle,
 * based on the financing start date and the payment day of month.
 *
 * Used in the finances page to replace purchasePrice with the sum of
 * processed monthly payments for financed vehicles.
 */

import { getLocalYmd } from "@/lib/utils/date-helpers";

/** Helper to round to 2 decimal places (cents) */
function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface FinancingPayment {
  /** Local calendar date the payment is counted (YYYY-MM-DD). */
  date: string;
  amount: number;
}

/**
 * Monthly payments that have already come due.
 * Each entry is one full monthly payment. Counting stops once the purchase
 * price has been covered, matching `calculateFinancing`.
 */
export function listFinancingPayments(
  vehicle: FinancedVehicle,
  asOfDate: Date = new Date()
): FinancingPayment[] {
  if (
    !vehicle.isFinanced ||
    !vehicle.monthlyPayment ||
    vehicle.monthlyPayment <= 0 ||
    !vehicle.financingStartDate
  ) {
    return [];
  }

  const monthlyPayment = vehicle.monthlyPayment;
  const rawDay = Number(vehicle.paymentDayOfMonth) || 1;
  if (rawDay < 1 || rawDay > 31) {
    throw new Error(`Invalid payment day: ${rawDay}. Must be between 1 and 31.`);
  }
  const paymentDay = rawDay;
  const purchasePrice = vehicle.purchasePrice ?? 0;
  if (purchasePrice < 0) return [];

  const startDate = new Date(vehicle.financingStartDate);
  if (isNaN(startDate.getTime())) return [];

  const payments: FinancingPayment[] = [];
  let totalPaid = 0;
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const today = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), asOfDate.getDate());

  while (current <= today) {
    const year = current.getFullYear();
    const month = current.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const actualPaymentDay = Math.min(paymentDay, daysInMonth);
    const paymentDate = new Date(year, month, actualPaymentDay);

    if (paymentDate >= startDate && paymentDate <= today) {
      payments.push({ date: getLocalYmd(paymentDate), amount: monthlyPayment });
      totalPaid = roundCents(totalPaid + monthlyPayment);
      if (purchasePrice > 0 && totalPaid >= purchasePrice) break;
    }

    current.setMonth(current.getMonth() + 1);
  }

  return payments;
}

/** Sum of financing payments whose dates fall in an inclusive YYYY-MM-DD range. */
export function sumFinancingPaymentsInRange(
  vehicles: FinancedVehicle[],
  from: string,
  to: string,
  asOfDate: Date = new Date()
): number {
  let total = 0;
  for (const vehicle of vehicles) {
    for (const payment of listFinancingPayments(vehicle, asOfDate)) {
      if (payment.date >= from && payment.date <= to) total += payment.amount;
    }
  }
  return roundCents(total);
}

/** Sum of every financing payment already due, across the given vehicles. */
export function sumFinancingPaymentsToDate(
  vehicles: FinancedVehicle[],
  asOfDate: Date = new Date()
): number {
  let total = 0;
  for (const vehicle of vehicles) {
    for (const payment of listFinancingPayments(vehicle, asOfDate)) {
      total += payment.amount;
    }
  }
  return roundCents(total);
}

export interface FinancingInfo {
  /** Number of monthly payments that have been processed */
  paymentsProcessed: number;
  /** Total amount paid so far (paymentsProcessed * monthlyPayment) */
  totalPaid: number;
  /** The monthly payment amount */
  monthlyPayment: number;
  /** Day of month when payment processes */
  paymentDayOfMonth: number;
  /** Full purchase price of the vehicle */
  purchasePrice: number;
  /** Remaining balance (purchasePrice - totalPaid), minimum 0 */
  remainingBalance: number;
  /** Next payment date (ISO string) */
  nextPaymentDate: string;
  /** Whether the vehicle is fully paid off */
  isPaidOff: boolean;
}

export interface FinancedVehicle {
  isFinanced?: boolean;
  monthlyPayment?: number;
  paymentDayOfMonth?: number;
  financingStartDate?: string | null;
  purchasePrice?: number;
}

/**
 * Calculate the number of monthly payments processed and total paid.
 *
 * Logic:
 * - Start from financingStartDate
 * - For each month from start to now, check if payment day has passed
 * - If current month's payment day <= today, count it
 * - Stop counting once totalPaid >= purchasePrice (vehicle is paid off)
 */
export function calculateFinancing(
  vehicle: FinancedVehicle,
  asOfDate: Date = new Date()
): FinancingInfo | null {
  if (
    !vehicle.isFinanced ||
    !vehicle.monthlyPayment ||
    vehicle.monthlyPayment <= 0 ||
    !vehicle.financingStartDate
  ) {
    return null;
  }

  const monthlyPayment = vehicle.monthlyPayment;
  const rawDay = Number(vehicle.paymentDayOfMonth) || 1;
  if (rawDay < 1 || rawDay > 31) {
    throw new Error(`Invalid payment day: ${rawDay}. Must be between 1 and 31.`);
  }
  const paymentDay = rawDay;
  const purchasePrice = vehicle.purchasePrice ?? 0;
  if (purchasePrice < 0) return null;

  const startDate = new Date(vehicle.financingStartDate);
  if (isNaN(startDate.getTime())) return null;

  const payments = listFinancingPayments(vehicle, asOfDate);
  const paymentsProcessed = payments.length;
  let totalPaid = roundCents(payments.reduce((sum, payment) => sum + payment.amount, 0));
  if (purchasePrice > 0 && totalPaid > purchasePrice) totalPaid = purchasePrice;

  const today = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), asOfDate.getDate());

  const remainingBalance = Math.max(0, purchasePrice - totalPaid);
  const isPaidOff = purchasePrice > 0 && totalPaid >= purchasePrice;

  // Calculate next payment date
  let nextPaymentDate: Date;
  if (isPaidOff) {
    // No more payments
    nextPaymentDate = new Date(0);
  } else {
    const nextMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const daysInCurrentMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    ).getDate();
    const currentMonthPaymentDay = Math.min(paymentDay, daysInCurrentMonth);

    if (today.getDate() < currentMonthPaymentDay) {
      // Payment hasn't happened this month yet
      nextPaymentDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        currentMonthPaymentDay
      );
    } else {
      // Payment already happened this month, next is next month
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const daysInNextMonth = new Date(
        nextMonth.getFullYear(),
        nextMonth.getMonth() + 1,
        0
      ).getDate();
      nextPaymentDate = new Date(
        nextMonth.getFullYear(),
        nextMonth.getMonth(),
        Math.min(paymentDay, daysInNextMonth)
      );
    }
  }

  return {
    paymentsProcessed,
    totalPaid,
    monthlyPayment,
    paymentDayOfMonth: paymentDay,
    purchasePrice,
    remainingBalance,
    nextPaymentDate: isPaidOff ? "" : nextPaymentDate.toISOString().split("T")[0],
    isPaidOff,
  };
}
