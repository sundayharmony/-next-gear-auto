import type { PricingBreakdown } from "@/lib/types";
import { applyDiscount } from "@/lib/utils/price-calculator";

export interface PromoCodeRow {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_booking_amount: number | null;
  max_uses: number | null;
  used_count: number | null;
  expires_at: string | null;
  description: string | null;
  is_active: boolean;
  promo_type?: "campaign" | "referral" | string | null;
  owner_customer_id?: string | null;
}

export interface PromoValidationContext {
  customerId?: string | null;
}

type PromoValidationResult =
  | {
      ok: true;
      pricing: PricingBreakdown & {
        discount?: {
          code: string;
          discountType: "percentage" | "fixed";
          discountValue: number;
          discountAmount: number;
          description: string;
        };
      };
    }
  | { ok: false; message: string };

type PromoEligibilityResult =
  | { ok: true }
  | { ok: false; message: string };

function promoExpiry(expiresAt: string): Date {
  return new Date(expiresAt.includes("T") ? expiresAt : `${expiresAt}T23:59:59`);
}

export function validatePromoEligibility(
  promo: PromoCodeRow,
  bookingAmount: number,
  now = new Date(),
  context: PromoValidationContext = {},
): PromoEligibilityResult {
  if (!promo.is_active) {
    return { ok: false, message: "This promo code is no longer active" };
  }

  if (
    promo.promo_type === "referral" &&
    promo.owner_customer_id &&
    context.customerId &&
    promo.owner_customer_id === context.customerId
  ) {
    return { ok: false, message: "You cannot use your own referral code" };
  }

  if (promo.expires_at && promoExpiry(promo.expires_at) < now) {
    return { ok: false, message: "This promo code has expired" };
  }

  if (promo.max_uses != null && (promo.used_count ?? 0) >= promo.max_uses) {
    return { ok: false, message: "This promo code has reached its usage limit" };
  }

  const minimum = promo.min_booking_amount ?? 0;
  if (minimum > 0 && bookingAmount < minimum) {
    return {
      ok: false,
      message: `Minimum booking amount of $${minimum} required`,
    };
  }

  return { ok: true };
}

export function validateAndApplyPromo(
  pricing: PricingBreakdown,
  promo: PromoCodeRow,
  now = new Date(),
  context: PromoValidationContext = {},
): PromoValidationResult {
  const eligibility = validatePromoEligibility(promo, pricing.subtotal, now, context);
  if (!eligibility.ok) {
    return eligibility;
  }

  return {
    ok: true,
    pricing: applyDiscount(pricing, {
      code: promo.code,
      discountType: promo.discount_type,
      discountValue: promo.discount_value,
      discountAmount: 0,
      description: promo.description || "",
    }),
  };
}

export async function redeemBookingPromo(
  supabase: {
    rpc: (
      name: "redeem_booking_promo",
      args: { p_booking_id: string },
    ) => PromiseLike<{ error: { message?: string } | null }>;
  },
  bookingId: string,
): Promise<void> {
  const { error } = await supabase.rpc("redeem_booking_promo", {
    p_booking_id: bookingId,
  });

  if (error) {
    throw new Error(error.message || "Failed to record promo redemption");
  }
}

export async function confirmFreeBooking(
  supabase: {
    rpc: (
      name: "confirm_free_booking",
      args: { p_booking_id: string },
    ) => PromiseLike<{
      data: boolean | null;
      error: { message?: string } | null;
    }>;
  },
  bookingId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("confirm_free_booking", {
    p_booking_id: bookingId,
  });

  if (error || data !== true) {
    throw new Error(
      error?.message || "Failed to confirm free booking",
    );
  }
}
