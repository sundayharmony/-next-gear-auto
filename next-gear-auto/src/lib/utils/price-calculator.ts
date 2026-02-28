import type { BookingExtra, PricingBreakdown } from "@/lib/types";

const TAX_RATE = 0.08;
const DEPOSIT_AMOUNT = 50;

export function calculateRentalDays(pickupDate: string, returnDate: string): number {
  const pickup = new Date(pickupDate);
  const returnD = new Date(returnDate);
  const diffTime = Math.abs(returnD.getTime() - pickup.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(diffDays, 1);
}

export function calculateBaseRate(
  days: number,
  dailyRate: number,
  weeklyRate: number,
  monthlyRate: number
): number {
  if (days >= 30) {
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    const remainingWeeks = Math.floor(remainingDays / 7);
    const remainingDaysAfterWeeks = remainingDays % 7;
    return months * monthlyRate + remainingWeeks * weeklyRate + remainingDaysAfterWeeks * dailyRate;
  }
  if (days >= 7) {
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    return weeks * weeklyRate + remainingDays * dailyRate;
  }
  return days * dailyRate;
}

export function calculateExtrasTotal(extras: BookingExtra[], days: number): { name: string; total: number }[] {
  return extras
    .filter((e) => e.selected)
    .map((extra) => {
      let total: number;
      if (extra.billingType === "one-time") {
        total = extra.pricePerDay;
      } else if (extra.billingType === "per-day-capped" && extra.maxPrice) {
        total = Math.min(extra.pricePerDay * days, extra.maxPrice);
      } else {
        total = extra.pricePerDay * days;
      }
      return { name: extra.name, total };
    });
}

export function calculatePricing(
  days: number,
  dailyRate: number,
  weeklyRate: number,
  monthlyRate: number,
  extras: BookingExtra[]
): PricingBreakdown {
  const baseTotal = calculateBaseRate(days, dailyRate, weeklyRate, monthlyRate);
  const extrasBreakdown = calculateExtrasTotal(extras, days);
  const extrasTotal = extrasBreakdown.reduce((sum, e) => sum + e.total, 0);
  const subtotal = baseTotal + extrasTotal;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = subtotal + tax;

  return {
    baseDays: days,
    baseRate: dailyRate,
    baseTotal,
    extras: extrasBreakdown,
    extrasTotal,
    subtotal,
    tax,
    taxRate: TAX_RATE,
    total,
    deposit: DEPOSIT_AMOUNT,
    dueAtPickup: total - DEPOSIT_AMOUNT,
  };
}
