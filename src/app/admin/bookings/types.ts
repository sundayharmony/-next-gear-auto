// ─── Shared types for the admin bookings module ───────────────────

export interface BookingRow {
  id: string;
  customer_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  vehicleName: string;
  vehicle_id: string;
  pickup_date: string;
  return_date: string;
  pickup_time?: string;
  return_time?: string;
  total_price: number;
  deposit: number;
  status: string;
  created_at: string;
  id_document_url?: string;
  insurance_proof_url?: string;
  insurance_opted_out?: boolean;
  signed_name?: string;
  agreement_signed_at?: string;
  rental_agreement_url?: string;
  extras?: ExtraItem[];
  admin_notes?: string;
  payment_method?: string;
  promo_code?: string;
  discount_amount?: number;
  is_overdue?: boolean;
}

export interface ExtraItem {
  id: string;
  name: string;
  pricePerDay: number;
  maxPrice: number | null;
  billingType: "per-day" | "per-day-capped" | "one-time";
  description: string;
  selected?: boolean;
}

export interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  dailyRate: number;
  isAvailable: boolean;
}

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

export const AVAILABLE_EXTRAS: ExtraItem[] = [
  { id: "e1", name: "Insurance Coverage", pricePerDay: 11.25, maxPrice: null, billingType: "per-day", description: "Basic collision damage waiver" },
  { id: "e2", name: "Child Seat", pricePerDay: 10, maxPrice: 50, billingType: "per-day-capped", description: "Infant and toddler car seat" },
  { id: "e3", name: "Roadside Assistance", pricePerDay: 8, maxPrice: null, billingType: "per-day", description: "24/7 emergency roadside assistance" },
  { id: "e4", name: "Fuel Pre-Pay", pricePerDay: 45, maxPrice: null, billingType: "one-time", description: "Pre-pay for a full tank" },
];

export const PAYMENT_METHODS = [
  { value: "stripe", label: "Stripe / Card" },
  { value: "cash", label: "Cash" },
  { value: "zelle", label: "Zelle" },
  { value: "venmo", label: "Venmo" },
  { value: "check", label: "Check" },
  { value: "other", label: "Other" },
];

export const STATUS_STEPS = ["pending", "confirmed", "active", "completed"] as const;

// Pre-generate time slot options (8:00 AM – 4:00 AM next day, 30-min intervals)
export const TIME_SLOTS = Array.from({ length: 41 }, (_, i) => {
  const hour = 8 + Math.floor(i / 2);
  const minute = i % 2 === 0 ? 0 : 30;
  const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const ampm = hour >= 12 && hour < 24 ? "PM" : "AM";
  const label = `${h12}:${String(minute).padStart(2, "0")} ${ampm}`;
  return { value, label };
});
