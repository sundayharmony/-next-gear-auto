import type { PricingBreakdown } from "@/lib/types";

/** Total charged at checkout (pricing + location surcharges − credit, matches server checkout). */
export function getCheckoutTotal(
  pricing: PricingBreakdown | null | undefined,
  locationSurcharge = 0,
  creditApplied = 0,
): number {
  if (!pricing) return 0;
  const surcharge = Math.max(0, locationSurcharge || 0);
  const beforeCredit = Math.round((pricing.total + surcharge) * 100) / 100;
  const credit = Math.max(0, creditApplied || 0);
  return Math.round(Math.max(0, beforeCredit - credit) * 100) / 100;
}
