import type { SupabaseClient } from "@supabase/supabase-js";
import { sumBookingPaymentAmounts } from "@/lib/bookings/payments";
import {
  formatYyyyMmDdLocal,
  getRecurringBillingSummary,
  listRecurringWeeklyDueDates,
  parseRecurringBookingMeta,
  parseRecurringWeekPaymentNote,
  recurringWeekPaymentNote,
} from "@/lib/utils/recurring-booking";

export interface SyncRecurringPaymentsResult {
  new_deposit: number;
  payments_added: number;
  weeks_due: number;
}

/**
 * Ensures one booking_payments row per weekly period due through today, then
 * recalculates deposit from the ledger. Used when marking recurring rentals caught up.
 */
export async function syncRecurringPaymentsToDate(
  supabase: SupabaseClient,
  bookingId: string
): Promise<SyncRecurringPaymentsResult> {
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("pickup_date, total_price, deposit, admin_notes, payment_method")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError || !booking) {
    throw new Error("Booking not found");
  }

  const summary = getRecurringBillingSummary({
    pickup_date: booking.pickup_date,
    total_price: Number(booking.total_price) || 0,
    deposit: booking.deposit,
    admin_notes: booking.admin_notes,
  });

  if (!summary) {
    throw new Error("Booking is not a recurring long-term rental");
  }

  const meta = parseRecurringBookingMeta(booking.admin_notes);
  if (!meta.weeklyDueDay) {
    throw new Error("Weekly due day is not set for this recurring rental");
  }

  const today = formatYyyyMmDdLocal(new Date());
  const dueDates = listRecurringWeeklyDueDates(
    booking.pickup_date,
    meta.weeklyDueDay,
    today
  );

  const { data: existing, error: listError } = await supabase
    .from("booking_payments")
    .select("id, note")
    .eq("booking_id", bookingId);

  if (listError) {
    throw new Error(listError.message);
  }

  const paidPeriodEnds = new Set<string>();
  for (const row of existing || []) {
    const periodEnd = parseRecurringWeekPaymentNote(row.note);
    if (periodEnd) paidPeriodEnds.add(periodEnd);
  }

  let paymentsAdded = 0;
  const method =
    typeof booking.payment_method === "string" && booking.payment_method
      ? booking.payment_method
      : "cash";

  for (const periodEnd of dueDates) {
    if (paidPeriodEnds.has(periodEnd)) continue;

    const { error: insertError } = await supabase.from("booking_payments").insert({
      booking_id: bookingId,
      amount: summary.weeklyRate,
      method,
      note: recurringWeekPaymentNote(periodEnd),
    });
    if (insertError) {
      throw new Error(insertError.message);
    }
    paymentsAdded++;
    paidPeriodEnds.add(periodEnd);
  }

  const { data: allPayments, error: sumError } = await supabase
    .from("booking_payments")
    .select("amount")
    .eq("booking_id", bookingId);

  if (sumError) {
    throw new Error(sumError.message);
  }

  const newDeposit = sumBookingPaymentAmounts(allPayments || []);

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ deposit: newDeposit })
    .eq("id", bookingId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    new_deposit: newDeposit,
    payments_added: paymentsAdded,
    weeks_due: summary.weeksDue,
  };
}

export function isRecurringLongTermBooking(adminNotes?: string | null): boolean {
  const meta = parseRecurringBookingMeta(adminNotes);
  return meta.isRecurringLongTerm && !!meta.weeklyDueDay;
}
