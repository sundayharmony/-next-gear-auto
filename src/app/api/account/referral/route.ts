import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { getAuthFromRequest } from "@/lib/auth/jwt";
import { ensureReferralCodeForCustomer } from "@/lib/referrals/referral-codes";
import {
  getCustomerCreditBalance,
  type CreditLedgerEntry,
} from "@/lib/referrals/customer-credits";
import { logger } from "@/lib/utils/logger";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth?.sub) {
      return NextResponse.json(
        { success: false, message: "Sign in required" },
        { status: 401 },
      );
    }

    const supabase = getServiceSupabase();
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, password_hash")
      .eq("id", auth.sub)
      .maybeSingle();

    if (customerError || !customer) {
      return NextResponse.json(
        { success: false, message: "Account not found" },
        { status: 404 },
      );
    }

    let referralCode: string | null = null;
    if (customer.password_hash) {
      referralCode = await ensureReferralCodeForCustomer(supabase, customer.id);
    }

    const balance = await getCustomerCreditBalance(supabase, customer.id);

    const { data: ledgerRows, error: ledgerError } = await supabase
      .from("customer_credit_ledger")
      .select("id, amount, source_type, source_booking_id, source_promo_code, created_at")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (ledgerError) {
      logger.error("Referral ledger fetch error:", ledgerError);
    }

    const ledger: CreditLedgerEntry[] = (ledgerRows ?? []).map((row: {
      id: string;
      amount: number | string | null;
      source_type: string;
      source_booking_id: string | null;
      source_promo_code: string | null;
      created_at: string;
    }) => ({
      id: row.id,
      amount: Number(row.amount ?? 0),
      sourceType: row.source_type as CreditLedgerEntry["sourceType"],
      sourceBookingId: row.source_booking_id,
      sourcePromoCode: row.source_promo_code,
      createdAt: row.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: {
        referralCode,
        balance,
        ledger,
      },
    });
  } catch (error) {
    logger.error("Account referral fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load referral details" },
      { status: 500 },
    );
  }
}
