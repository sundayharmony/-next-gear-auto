import { getServiceSupabase } from "@/lib/db/supabase";

export type CreditLedgerSourceType =
  | "referral_reward"
  | "booking_redemption"
  | "admin_adjustment";

export interface CreditLedgerEntry {
  id: string;
  amount: number;
  sourceType: CreditLedgerSourceType;
  sourceBookingId: string | null;
  sourcePromoCode: string | null;
  createdAt: string;
}

type ServiceSupabase = ReturnType<typeof getServiceSupabase>;

export async function getCustomerCreditBalance(
  supabase: ServiceSupabase,
  customerId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("customer_credit_ledger")
    .select("amount")
    .eq("customer_id", customerId);

  if (error || !data) return 0;

  const total = data.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  return Math.round(Math.max(0, total) * 100) / 100;
}

export function clampCreditApplication(
  requested: number,
  availableBalance: number,
  totalDue: number,
): number {
  const safeRequested = Number.isFinite(requested) ? Math.max(0, requested) : 0;
  const safeBalance = Math.max(0, availableBalance);
  const safeTotal = Math.max(0, totalDue);
  const maxApplicable = Math.min(safeBalance, safeTotal);
  return Math.round(Math.min(safeRequested, maxApplicable) * 100) / 100;
}
