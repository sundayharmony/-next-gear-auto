/**
 * Pure helpers for booking deposit ↔ payment rows (used by admin booking-payments API).
 */

export function sumBookingPaymentAmounts(rows: { amount: number | null | undefined }[]): number {
  return rows.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}
