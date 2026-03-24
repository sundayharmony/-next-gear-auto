/**
 * Vehicle Financing Calculator
 *
 * Calculates how many monthly payments have been processed for a financed vehicle,
 * based on the financing start date and the payment day of month.
 *
 * Used in the finances page to replace purchasePrice with the sum of
 * processed monthly payments for financed vehicles.
 */

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
  financingStartDate?: string;
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
  const paymentDay = Math.min(Math.max(vehicle.paymentDayOfMonth || 1, 1), 31);
  const purchasePrice = vehicle.purchasePrice ?? 0;
  const startDate = new Date(vehicle.financingStartDate);

  if (isNaN(startDate.getTime())) return null;

  let paymentsProcessed = 0;
  let totalPaid = 0;

  // Iterate month by month from financing start date
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const today = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), asOfDate.getDate());

  while (current <= today) {
    const year = current.getFullYear();
    const month = current.getMonth();

    // Get the actual payment day for this month (handle months with fewer days)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const actualPaymentDay = Math.min(paymentDay, daysInMonth);

    const paymentDate = new Date(year, month, actualPaymentDay);

    // Only count if the payment date has passed and is on or after the financing start
    if (paymentDate >= startDate && paymentDate <= today) {
      paymentsProcessed++;
      totalPaid += monthlyPayment;

      // Stop if vehicle is paid off
      if (purchasePrice > 0 && totalPaid >= purchasePrice) {
        totalPaid = purchasePrice;
        break;
      }
    }

    // Move to next month
    current.setMonth(current.getMonth() + 1);
  }

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
