import type { BookingExtra } from "@/lib/types";
import { PAYMENT_METHODS } from "@/lib/types";

export type AgreementPaymentMethod = "stripe" | "cash" | "zelle" | "venmo" | "check" | "other" | string;

export interface AgreementBookingContext {
  paymentMethod?: AgreementPaymentMethod | null;
  insuranceOptedOut?: boolean;
  insuranceProofOnFile?: boolean;
  pickupLocationName?: string | null;
  returnLocationName?: string | null;
  extrasSummary?: string | null;
  promoCode?: string | null;
  discountAmount?: number;
}

export interface AgreementBookingRow {
  payment_method?: string | null;
  insurance_opted_out?: boolean | null;
  insurance_proof_url?: string | null;
  pickup_location_name?: string | null;
  return_location_name?: string | null;
  extras?: BookingExtra[] | Record<string, unknown>[] | unknown[] | null;
  promo_code?: string | null;
  discount_amount?: number | null;
}

function formatExtras(extras: AgreementBookingRow["extras"]): string | null {
  if (!extras || !Array.isArray(extras) || extras.length === 0) return null;
  const lines = extras
    .map((e) => {
      const row = e as Record<string, unknown>;
      const name = String(row.name || row.id || "Extra");
      if (row.selected === false) return null;
      return name;
    })
    .filter(Boolean);
  return lines.length ? lines.join(", ") : null;
}

export function buildAgreementBookingContext(row: AgreementBookingRow): AgreementBookingContext {
  return {
    paymentMethod: row.payment_method || null,
    insuranceOptedOut: Boolean(row.insurance_opted_out),
    insuranceProofOnFile: Boolean(row.insurance_proof_url?.trim()),
    pickupLocationName: row.pickup_location_name || null,
    returnLocationName: row.return_location_name || null,
    extrasSummary: formatExtras(row.extras),
    promoCode: row.promo_code || null,
    discountAmount: row.discount_amount ?? 0,
  };
}

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return "Credit/Debit";
  const found = PAYMENT_METHODS.find((m) => m.value === method);
  return found?.label ?? method;
}
