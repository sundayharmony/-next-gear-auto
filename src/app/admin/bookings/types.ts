// ─── Shared types for the admin bookings module ───────────────────
// Re-exports canonical types from @/lib/types; adds booking-module-specific types.

// Re-export shared types so booking components can import from one place
import type { BookingDbRow, BookingExtra, VehicleListItem } from "@/lib/types";
export type { BookingExtra as ExtraItem, VehicleListItem as Vehicle } from "@/lib/types";
export { TIME_SLOTS, PAYMENT_METHODS, STATUS_STEPS } from "@/lib/types";

// Re-export extras from the single source of truth (data/extras.json)
// We import and re-export so components don't need to know about the JSON file.
import extrasData from "@/data/extras.json";
export const AVAILABLE_EXTRAS: BookingExtra[] = extrasData as BookingExtra[];

export interface BookingRow extends Omit<BookingDbRow, "total_price" | "deposit"> {
  total_price: number | null;
  deposit: number | null;
  canViewPricing?: boolean;
  canManage?: boolean;
}

// ─── Booking-module-specific types (not shared elsewhere) ─────────

export interface CustomerOption {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface ActivityRecord {
  id: string;
  booking_id: string;
  action: string;
  details: Record<string, unknown>;
  performed_by: string | null;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  booking_id: string;
  amount: number;
  method: string;
  note: string;
  received_at: string;
}

export interface TicketRecord {
  id: string;
  ticketType: string;
  violationDate: string;
  municipality: string;
  state: string;
  prefix: string;
  ticketNumber: string;
  amountDue: number;
  status: string;
  licensePlate: string;
}

export type SortField = "customer_name" | "pickup_date" | "return_date" | "total_price" | "status" | "created_at";
export type SortOrder = "asc" | "desc";
