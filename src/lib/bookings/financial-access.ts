/**
 * Centralized booking-level financial access control.
 *
 * Rule of record (single source of truth):
 *   • Admins can always view a booking's financial data.
 *   • Managers can ONLY view a booking's financial data when an admin has
 *     explicitly granted it for that specific booking via the per-booking
 *     `manager_financial_access` flag.
 *   • Everyone else (customers/owners/unauthenticated) never gets the staff
 *     financial view through these helpers.
 *
 * This module is intentionally tiny and dependency-free so every API route
 * and server query can share the exact same authorization logic instead of
 * re-deriving it (which previously caused drift and leaks).
 */

/** Minimal shape needed to evaluate per-booking financial access. */
export interface BookingFinancialAccessInput {
  created_by_user_id?: string | null;
  manager_financial_access?: boolean | null;
}

type StaffRole = "admin" | "manager";

/**
 * Whether a staff member may view this booking's financial data.
 * Admins: always. Managers: only when `manager_financial_access === true`.
 */
export function canViewBookingFinancials(
  role: string | null | undefined,
  booking: BookingFinancialAccessInput | null | undefined
): boolean {
  if (role === "admin") return true;
  if (role === "manager") return booking?.manager_financial_access === true;
  return false;
}

/**
 * Whether a staff member may manage (edit) this booking. This is independent
 * of financial visibility: managers keep operational control of the bookings
 * they created, but that does NOT grant them financial visibility.
 */
export function canManageBooking(
  role: string | null | undefined,
  booking: BookingFinancialAccessInput | null | undefined,
  userId: string | null | undefined
): boolean {
  if (role === "admin") return true;
  if (role === "manager") {
    return !!booking?.created_by_user_id && booking.created_by_user_id === userId;
  }
  return false;
}

/**
 * Every booking field that conveys financial information. When a manager is
 * not authorized, these are nulled before the row ever leaves the server so
 * data cannot leak through the API response or client state / dev tools.
 *
 * Includes raw money columns, derived money fields produced by enrichment,
 * and payment-status signals (the spec requires hiding payment status too).
 */
export const BOOKING_FINANCIAL_FIELDS = [
  "total_price",
  "deposit",
  "location_surcharge",
  "discount_amount",
  "payment_method",
  "effective_total_price",
  "recurring_weekly_rate",
  "recurring_balance_due",
  "is_payment_overdue",
] as const;

/**
 * Returns a shallow copy of `row` with all financial fields nulled out when
 * the viewer is not authorized. When authorized, the row is returned as-is.
 * Always stamps `canViewPricing` so the UI has an unambiguous flag.
 */
export function redactBookingFinancials<T extends Record<string, unknown>>(
  row: T,
  canView: boolean
): T & { canViewPricing: boolean } {
  if (canView) {
    return { ...row, canViewPricing: true };
  }
  const out: Record<string, unknown> = { ...row };
  for (const field of BOOKING_FINANCIAL_FIELDS) {
    if (field in out) out[field] = null;
  }
  return { ...out, canViewPricing: false } as T & { canViewPricing: boolean };
}
