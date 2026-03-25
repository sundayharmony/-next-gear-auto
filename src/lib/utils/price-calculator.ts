import type { BookingExtra, PricingBreakdown } from "@/lib/types";

const TAX_RATE = 0.08;
const MULTI_DAY_DISCOUNT_RATE = 0.075; // 7.5% per additional day
const INSURANCE_DISCOUNT_RATE = 0.15;  // 15% off insurance
const INSURANCE_EXTRA_ID = "e1";

export function calculateRentalDays(pickupDate: string, returnDate: string): number {
  const pickup = new Date(pickupDate);
  const returnD = new Date(returnDate);
  const diffTime = Math.abs(returnD.getTime() - pickup.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(diffDays, 1);
}

/**
 * Calculate the base rental cost with multi-day discount.
 * Day 1 is full price; each additional day gets 7.5% off per extra day.
 * e.g. 3-day rental at $49/day:
 *   Day 1: $49.00 (full)
 *   Day 2: $49 × (1 - 0.075) = $45.33
 *   Day 3: $49 × (1 - 0.150) = $41.65
 *   Total: $135.98  (vs $147 without discount)
 */
export function calculateBaseRate(days: number, dailyRate: number): { total: number; discount: number } {
  if (days <= 1) {
    return { total: dailyRate, discount: 0 };
  }

  let total = 0;
  for (let d = 0; d < days; d++) {
    const discountForDay = d * MULTI_DAY_DISCOUNT_RATE; // 0 for day 1, 0.075 for day 2, etc.
    const cappedDiscount = Math.min(discountForDay, 1); // never exceed 100%
    total += dailyRate * (1 - cappedDiscount);
  }

  total = Math.round(total * 100) / 100;
  const fullPrice = days * dailyRate;
  const discount = Math.round((fullPrice - total) * 100) / 100;

  return { total, discount };
}

/**
 * Calculate extras totals with 15% insurance discount applied.
 */
export function calculateExtrasTotal(
  extras: BookingExtra[],
  days: number
): { items: { name: string; total: number }[]; insuranceDiscount: number } {
  let insuranceDiscount = 0;

  const items = extras
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

      // Apply 15% insurance discount
      if (extra.id === INSURANCE_EXTRA_ID) {
        const fullTotal = total;
        total = Math.round(total * (1 - INSURANCE_DISCOUNT_RATE) * 100) / 100;
        insuranceDiscount = Math.round((fullTotal - total) * 100) / 100;
      }

      return { name: extra.name, total };
    });

  return { items, insuranceDiscount };
}

export function calculatePricing(
  days: number,
  dailyRate: number,
  extras: BookingExtra[]
): PricingBreakdown {
  const base = calculateBaseRate(days, dailyRate);
  const extrasResult = calculateExtrasTotal(extras, days);
  const extrasTotal = extrasResult.items.reduce((sum, e) => sum + e.total, 0);
  const subtotal = base.total + extrasTotal;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = subtotal + tax;

  return {
    baseDays: days,
    baseRate: dailyRate,
    baseTotal: base.total,
    multiDayDiscount: base.discount,
    insuranceDiscount: extrasResult.insuranceDiscount,
    extras: extrasResult.items,
    extrasTotal,
    subtotal,
    tax,
    taxRate: TAX_RATE,
    total,
    deposit: total,
    dueAtPickup: 0,
  };
}

export interface PromoDiscount {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountAmount: number;
  description: string;
}

export function applyDiscount(
  pricing: PricingBreakdown,
  discount: PromoDiscount
): PricingBreakdown & { discount: PromoDiscount } {
  const discountAmount = discount.discountType === "percentage"
    ? Math.round(pricing.subtotal * (discount.discountValue / 100) * 100) / 100
    : Math.min(discount.discountValue, pricing.subtotal);

  const discountedSubtotal = pricing.subtotal - discountAmount;
  const tax = Math.round(discountedSubtotal * TAX_RATE * 100) / 100;
  const total = discountedSubtotal + tax;

  return {
    ...pricing,
    subtotal: discountedSubtotal,
    tax,
    total,
    dueAtPickup: 0,
    discount: {
      ...discount,
      discountAmount,
    },
  };
}
