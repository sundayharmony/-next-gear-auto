/**
 * Booking status lifecycle — single source of truth for PATCH /api/bookings validation.
 * Used by API routes; Android and other clients should rely on server responses, not duplicate rules.
 */

export const BOOKING_STATUSES = ["pending", "confirmed", "active", "completed", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Directed edges: from -> allowed next statuses */
export const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["active", "cancelled"],
  active: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function isBookingStatus(value: string): value is BookingStatus {
  return (BOOKING_STATUSES as readonly string[]).includes(value);
}

export function getAllowedTransitions(from: string): BookingStatus[] {
  if (!isBookingStatus(from)) return [];
  return VALID_TRANSITIONS[from];
}

export function canTransitionStatus(from: string, to: string): boolean {
  return getAllowedTransitions(from).includes(to as BookingStatus);
}

export type TransitionValidation =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Validates an attempted status change (when newStatus differs from current).
 */
export function validateStatusTransition(currentStatus: string, newStatus: string): TransitionValidation {
  if (newStatus === currentStatus) return { ok: true };
  if (!canTransitionStatus(currentStatus, newStatus)) {
    return {
      ok: false,
      message: `Cannot transition from ${currentStatus} to ${newStatus}`,
    };
  }
  return { ok: true };
}

/**
 * Rule enforced in PATCH: pending → confirmed requires a signed agreement timestamp.
 */
export function validateConfirmRequiresAgreement(args: {
  currentStatus: string;
  newStatus: string;
  agreementSignedAt: string | null | undefined;
}): TransitionValidation {
  if (
    args.newStatus === "confirmed" &&
    args.currentStatus === "pending" &&
    !args.agreementSignedAt
  ) {
    return {
      ok: false,
      message: "Cannot confirm booking — the rental agreement has not been signed yet.",
    };
  }
  return { ok: true };
}
