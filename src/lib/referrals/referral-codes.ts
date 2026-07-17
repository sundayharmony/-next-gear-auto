import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";

export const REFERRAL_DISCOUNT_PERCENT = 7.5;
export const REFERRAL_PROMO_TYPE = "referral";

type ServiceSupabase = ReturnType<typeof getServiceSupabase>;

function referralCodeFromCustomerId(customerId: string): string {
  const compact = customerId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const suffix = compact.slice(-8).padStart(8, "0");
  return `REF-${suffix}`;
}

export async function ensureReferralCodeForCustomer(
  supabase: ServiceSupabase,
  customerId: string,
): Promise<string | null> {
  if (!customerId) return null;

  const { data: existing, error: existingError } = await supabase
    .from("promo_codes")
    .select("code")
    .eq("owner_customer_id", customerId)
    .eq("promo_type", REFERRAL_PROMO_TYPE)
    .maybeSingle();

  if (existingError) {
    logger.error("Referral code lookup failed:", existingError);
    return null;
  }

  if (existing?.code) {
    return existing.code;
  }

  const code = referralCodeFromCustomerId(customerId);
  const { data: created, error: createError } = await supabase
    .from("promo_codes")
    .insert({
      code,
      promo_type: REFERRAL_PROMO_TYPE,
      owner_customer_id: customerId,
      discount_type: "percentage",
      discount_value: REFERRAL_DISCOUNT_PERCENT,
      min_booking_amount: 0,
      max_uses: null,
      used_count: 0,
      expires_at: null,
      description: "Refer a friend — 7.5% off their booking",
      is_active: true,
    })
    .select("code")
    .maybeSingle();

  if (createError) {
    if (
      createError.message?.toLowerCase().includes("duplicate") ||
      createError.message?.toLowerCase().includes("unique")
    ) {
      const { data: retry } = await supabase
        .from("promo_codes")
        .select("code")
        .eq("owner_customer_id", customerId)
        .eq("promo_type", REFERRAL_PROMO_TYPE)
        .maybeSingle();
      return retry?.code ?? code;
    }
    logger.error("Referral code create failed:", createError);
    return null;
  }

  return created?.code ?? code;
}
