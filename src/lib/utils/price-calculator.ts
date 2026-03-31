import type { BookingExtra, PricingBreakdown } from "@/lib/types";

const TAX_RATE = 0.08;
const MULTI_DAY_DISCOUNT_RATE = 0.075; // 7.5% per additional day
const MAX_MULTI_DAY_DISCOUNT = 0.25;  // cap at 25% max discount per day
const INSURANCE_DISCOUNT_RATE = 0.15;  // 15% off insurance
const INSURANCE_EXTRA_ID = "e1";

/** Round to 2 decimal places with epsilon correction for floating-point precision */
function roundCents(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function calculateRentalDays(pickupDate: string, returnDate: string): number {
  // Ensure consistent date parsing: append T00:00:00 if date string doesn't contain time component
  const pickup = new Date(pickupDate.includes("T") ? pickupDate : pickupDate + "T00:00:00");
  const returnD = new Date(returnDate.includes("T") ? returnDate : returnDate + "T00:00:00");
  // Time stripping is intentional: we strip time components to calculate days at midnight boundaries
  const diffTime = returnD.getTime() - pickup.getTime();
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  // Guard against NaN and negative dates — throw error instead of silently defaulting
  if (!Number.isFinite(days) || days < 1) {
    throw new Error(
      `Invalid rental days calculated: pickup=${pickupDate}, return=${returnDate}, days=${days}. Return date must be after pickup date.`
    );
  }
  return days;
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
    const cappedDiscount = Math.min(discountForDay, MAX_MULTI_DAY_DISCOUNT); // cap at 25%
    total += dailyRate * (1 - cappedDiscount);
  }

  total = roundCents(total);
  const fullPrice = days * dailyRate;
  const discount = roundCents(fullPrice - total);

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
        total = Math.max(0, extra.pricePerDay);
      } else if (extra.billingType === "per-day-capped" && extra.maxPrice) {
        total = Math.min(Math.max(0, extra.pricePerDay) * days, Math.max(0, extra.maxPrice ?? Infinity));
      } else {
        total = Math.max(0, extra.pricePerDay) * days;
      }

      // Apply 15% insurance discount
      if (extra.id === INSURANCE_EXTRA_ID) {
        const fullTotal = total;
        total = roundCents(total * (1 - INSURANCE_DISCOUNT_RATE));
        insuranceDiscount = roundCents(fullTotal - total);
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
  const tax = roundCents(subtotal * TAX_RATE);
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
    ? roundCents(pricing.subtotal * (discount.discountValue / 100))
    : Math.min(discount.discountValue, pricing.subtotal);

  const discountedSubtotal = pricing.subtotal - discountAmount;
  const tax = roundCents(discountedSubtotal * TAX_RATE);
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
