import type {
  OwnerBookingStatus,
  PayoutBreakdown,
} from "@/lib/types";
import { formatYyyyMmDdLocal } from "@/lib/utils/booking-dates";

/**
 * Owner payout math — the single source of truth shared by API routes and the
 * UI so the breakdown shown to owners always matches what is stored.
 *
 * Model (clear, non-overlapping):
 *   Gross Revenue   = booking rental total (deposits are refundable, excluded)
 *   Processing Fees = payment-processor cut (Stripe-style 2.9% + $0.30)
 *   Other Expenses  = admin-allocated costs for the booking (default 0)
 *   Net Revenue     = Gross − Processing Fees − Other Expenses
 *   Owner Payout    = Net Revenue × ownerPercentage%
 *   Platform Fees   = Net Revenue × (100 − ownerPercentage)%   (the platform's share)
 *
 *   So: Owner Payout + Platform Fees = Net Revenue.
 */

export const DEFAULT_OWNER_PERCENTAGE = 70;
const PROCESSING_RATE = 0.029;
const PROCESSING_FLAT = 0.3;

function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

export interface PayoutInput {
  grossRevenue: number;
  ownerPercentage?: number;
  /** Override the auto-computed processor fee (e.g. cash bookings have none). */
  processingFees?: number;
  otherExpenses?: number;
  /** When 'cash' / non-card, processing fees default to 0 instead of the card estimate. */
  paymentMethod?: string | null;
}

export function estimateProcessingFee(gross: number, paymentMethod?: string | null): number {
  if (gross <= 0) return 0;
  const nonCard = paymentMethod
    ? ["cash", "zelle", "venmo", "check"].includes(paymentMethod.toLowerCase())
    : false;
  if (nonCard) return 0;
  return round2(gross * PROCESSING_RATE + PROCESSING_FLAT);
}

export function computePayoutBreakdown(input: PayoutInput): PayoutBreakdown {
  const grossRevenue = round2(Math.max(0, input.grossRevenue || 0));
  const ownerPercentage = clampPercentage(
    input.ownerPercentage ?? DEFAULT_OWNER_PERCENTAGE
  );
  const processingFees = round2(
    input.processingFees ?? estimateProcessingFee(grossRevenue, input.paymentMethod)
  );
  const otherExpenses = round2(Math.max(0, input.otherExpenses ?? 0));
  const netRevenue = round2(Math.max(0, grossRevenue - processingFees - otherExpenses));
  const ownerPayout = round2(netRevenue * (ownerPercentage / 100));
  const platformFees = round2(netRevenue - ownerPayout);
  return {
    grossRevenue,
    processingFees,
    otherExpenses,
    netRevenue,
    platformFees,
    ownerPercentage,
    ownerPayout,
  };
}

export function clampPercentage(pct: number): number {
  if (!Number.isFinite(pct)) return DEFAULT_OWNER_PERCENTAGE;
  return Math.min(100, Math.max(0, Math.round(pct * 100) / 100));
}

/** Inclusive day count between two YYYY-MM-DD dates (min 1). */
export function rentalDays(pickupDate: string, returnDate: string): number {
  const start = Date.parse(`${pickupDate}T00:00:00`);
  const end = Date.parse(`${returnDate}T00:00:00`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 1;
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

/**
 * Map raw booking status + dates to the owner-facing status label.
 * `today` is a YYYY-MM-DD string (local).
 */
export function deriveOwnerStatus(
  rawStatus: string,
  pickupDate: string,
  returnDate: string,
  today: string
): OwnerBookingStatus {
  const status = (rawStatus || "").toLowerCase();
  if (status === "cancelled" || status === "no-show") return "cancelled";
  if (status === "completed") return "completed";
  if (returnDate < today) return "completed";
  if (pickupDate > today) return "upcoming";
  // confirmed/active/pending and currently within the window
  if (status === "pending") return "upcoming";
  return "active";
}

/** Bookings that actually generate revenue for the owner (exclude cancelled). */
export function isRevenueBooking(rawStatus: string): boolean {
  const status = (rawStatus || "").toLowerCase();
  if (status === "turo") return true;
  return status !== "cancelled" && status !== "no-show";
}

export function isOwnerTuroBooking(booking: { kind?: string; id?: string }): boolean {
  return booking.kind === "turo" || (typeof booking.id === "string" && booking.id.startsWith("turo:"));
}

/** Staff-created bookings (not public website checkout). */
const PRIVATE_BOOKING_ORIGINS = new Set([
  "admin_panel",
  "manager_panel",
  "owner_panel",
]);

/**
 * Owner portal visibility: public checkout bookings always show; staff/private
 * bookings only from today onward (by created_at, local calendar day).
 */
export function isOwnerVisibleBooking(
  row: {
    kind?: string;
    origin_channel?: string | null;
    created_at?: string | null;
    createdAt?: string | null;
  },
  todayYmd: string
): boolean {
  if (isOwnerTuroBooking(row)) return true;

  const channel = (row.origin_channel || "unknown").toLowerCase();
  if (channel === "public_checkout") return true;
  // Staff-panel + legacy rows default to hidden until today.
  const isPrivate =
    PRIVATE_BOOKING_ORIGINS.has(channel) || channel === "unknown";
  if (!isPrivate) return true;

  const createdRaw = row.created_at ?? row.createdAt;
  if (!createdRaw) return false;

  const createdDay = new Date(createdRaw);
  if (Number.isNaN(createdDay.getTime())) return false;

  return formatYyyyMmDdLocal(createdDay) >= todayYmd;
}
