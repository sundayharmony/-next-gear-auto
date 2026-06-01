import type { PricingBreakdown } from "@/lib/types";

/** Total charged at checkout (pricing + location surcharges, matches server checkout). */
export function getCheckoutTotal(
  pricing: PricingBreakdown | null | undefined,
  locationSurcharge = 0
): number {
  if (!pricing) return 0;
  const surcharge = Math.max(0, locationSurcharge || 0);
  return Math.round((pricing.total + surcharge) * 100) / 100;
}
