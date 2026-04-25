import type { BookingExtra, PricingBreakdown } from "@/lib/types";

const TAX_RATE = 0.08;
const INSURANCE_DISCOUNT_RATE = 0.15;  // 15% off insurance
const INSURANCE_EXTRA_ID = "e1";
const SETUP_FEE = 10;  // $10 one-time booking setup/processing fee

/** Round to 2 decimal places with epsilon correction for floating-point precision */
function roundCents(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Round UP to the nearest 5 cents so totals end with 0 or 5. */
function roundUpToNickel(n: number): number {
  return roundCents(Math.ceil((n - Number.EPSILON) * 20) / 20);
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

export function calculateRentalHours(
  pickupDate: string,
  returnDate: string,
  pickupTime?: string | null,
  returnTime?: string | null,
): number {
  const pickup = new Date(`${pickupDate}T${pickupTime || "00:00"}:00`);
  const returnD = new Date(`${returnDate}T${returnTime || "00:00"}:00`);
  const diffHours = Math.ceil((returnD.getTime() - pickup.getTime()) / (1000 * 60 * 60));

  if (!Number.isFinite(diffHours) || diffHours < 1) {
    throw new Error(
      `Invalid rental hours calculated: pickup=${pickupDate} ${pickupTime}, return=${returnDate} ${returnTime}, hours=${diffHours}. Return datetime must be after pickup datetime.`,
    );
  }
  return diffHours;
}

/** Calculate base rental from daily rate on an hourly basis. */
export function calculateBaseRate(hours: number, dailyRate: number): { total: number; discount: number; hourlyRate: number } {
  if (dailyRate <= 0) {
    throw new Error("dailyRate must be greater than 0");
  }
  if (hours < 1) {
    throw new Error("hours must be at least 1");
  }
  const hourlyRate = dailyRate / 24;
  const total = roundCents(hourlyRate * hours);
  return { total, discount: 0, hourlyRate: roundCents(hourlyRate) };
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
  hours: number,
  dailyRate: number,
  extras: BookingExtra[]
): PricingBreakdown {
  const days = Math.max(1, Math.ceil(hours / 24));
  const base = calculateBaseRate(hours, dailyRate);
  const extrasResult = calculateExtrasTotal(extras, days);
  const extrasTotal = roundCents(extrasResult.items.reduce((sum, e) => sum + e.total, 0));
  const setupFee = SETUP_FEE;
  const subtotal = roundCents(base.total + extrasTotal + setupFee);
  const tax = roundCents(subtotal * TAX_RATE);
  const total = roundUpToNickel(subtotal + tax);

  return {
    baseHours: hours,
    baseDays: days,
    hourlyRate: base.hourlyRate,
    baseRate: dailyRate,
    baseTotal: base.total,
    multiDayDiscount: base.discount,
    insuranceDiscount: extrasResult.insuranceDiscount,
    extras: extrasResult.items,
    extrasTotal,
    setupFee,
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
  // Guard against NaN and Infinity values
  if (!Number.isFinite(discount.discountValue) || discount.discountValue < 0) {
    return { ...pricing, discount: undefined };
  }

  const discountAmount = discount.discountType === "percentage"
    ? roundCents(pricing.subtotal * (discount.discountValue / 100))
    : Math.min(discount.discountValue, pricing.subtotal);

  const discountedSubtotal = Math.max(0, pricing.subtotal - discountAmount);
  const tax = roundCents(discountedSubtotal * TAX_RATE);
  const total = roundUpToNickel(discountedSubtotal + tax);

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
