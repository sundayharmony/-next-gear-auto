// Vehicle Types
export type VehicleCategory = "compact" | "sedan" | "suv" | "truck" | "luxury" | "van";

export interface VehicleSpecs {
  passengers: number;
  luggage: number;
  transmission: "Automatic" | "Manual";
  fuelType: "Gasoline" | "Diesel" | "Hybrid" | "Electric";
  mpg: number;
  doors: number;
}

export interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  category: VehicleCategory;
  images: string[];
  specs: VehicleSpecs;
  dailyRate: number;
  features: string[];
  isAvailable: boolean;
  description: string;
  color: string;
  mileage: number;
  licensePlate: string;
  vin: string;
  maintenanceStatus: "good" | "needs-service" | "in-maintenance";
  isPublished?: boolean;
  purchasePrice?: number;
  isFinanced?: boolean;
  monthlyPayment?: number;
  paymentDayOfMonth?: number;
  financingStartDate?: string;
  createdAt?: string;
}

/** Helper to get display name like "2024 Toyota Camry" */
export function getVehicleDisplayName(v: { year: number; make: string; model: string }): string {
  return `${v.year} ${v.make} ${v.model}`;
}

// Booking Types
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled"
  | "no-show";

export type BookingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface BookingExtra {
  id: string;
  name: string;
  pricePerDay: number;
  maxPrice: number | null;
  billingType: "per-day" | "per-day-capped" | "one-time";
  description: string;
  selected?: boolean;
}

export interface Booking {
  id: string;
  customerId: string;
  vehicleId: string;
  pickupDate: string;
  returnDate: string;
  extras: BookingExtra[];
  totalPrice: number;
  deposit: number;
  status: BookingStatus;
  agreement: RentalAgreement | null;
  createdAt: string;
  customerName?: string;
  vehicleName?: string;
}

// Customer Types
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  driverLicense: DriverLicense | null;
  paymentMethods: PaymentMethod[];
  bookings: string[];
  createdAt: string;
  role: "customer" | "admin";
}

export interface DriverLicense {
  imageUrl: string;
  verified: boolean;
  verifiedAt: string | null;
  verifiedBy: string | null;
}

export interface PaymentMethod {
  id: string;
  type: "visa" | "mastercard" | "amex" | "discover";
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

// Rental Agreement
export interface RentalAgreement {
  id: string;
  bookingId: string;
  terms: string;
  signedName: string;
  signedAt: string;
  ipAddress: string;
}

// Review Types
export interface Review {
  id: string;
  customerId: string;
  customerName: string;
  vehicleId: string;
  rating: number;
  text: string;
  createdAt: string;
  isVerified: boolean;
}

// Blog Types
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  publishedAt: string;
  featuredImage: string;
}

// Pricing Types
export interface PricingBreakdown {
  baseDays: number;
  baseRate: number;
  baseTotal: number;
  multiDayDiscount: number;
  insuranceDiscount: number;
  extras: { name: string; total: number }[];
  extrasTotal: number;
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  deposit: number;
  dueAtPickup: number;
}

// Form Types
export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export interface BookingFormData {
  pickupDate: string;
  returnDate: string;
  vehicleCategory?: VehicleCategory;
  vehicleId?: string;
  extras: string[];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerDob: string;
  driverLicenseImage?: File;
  signedName: string;
  agreedToTerms: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

// Analytics Event Types
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, string | number | boolean>;
  timestamp: string;
}

// Toast/Notification Types
export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

// Navigation
export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

// Admin Dashboard Types
export interface DashboardMetrics {
  activeBookings: number;
  monthlyRevenue: number;
  fleetUtilization: number;
  pendingVerifications: number;
}

export interface ActivityItem {
  id: string;
  type: "booking" | "cancellation" | "signup" | "review";
  message: string;
  timestamp: string;
}

// Expense Types
export type ExpenseCategory = "maintenance" | "insurance" | "fuel" | "cleaning" | "parking" | "registration" | "other";

export interface Expense {
  id: string;
  vehicleId: string | null;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: string;
  createdAt: string;
}

// ─── Admin DB Row Types (snake_case — matches Supabase columns) ──────────

/** Pickup/dropoff location managed by admin */
export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat?: number;
  lng?: number;
  surcharge: number;
  is_default: boolean;
  is_active: boolean;
  notes?: string;
  created_at: string;
}

/** Booking as returned by the API / Supabase (snake_case columns) */
export interface BookingDbRow {
  id: string;
  customer_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  vehicleName: string;          // enriched by API join
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
  extras?: BookingExtra[];
  admin_notes?: string;
  payment_method?: string;
  promo_code?: string;
  discount_amount?: number;
  is_overdue?: boolean;
  pickup_location_id?: string;
  pickup_location_name?: string;
  return_location_id?: string;
  return_location_name?: string;
  location_surcharge?: number;
}

/** Minimal vehicle info used in admin list views */
export interface VehicleListItem {
  id: string;
  year: number;
  make: string;
  model: string;
  dailyRate: number;
  isAvailable: boolean;
}

/** Pre-generated time slot options (8 AM – midnight, 30-min intervals) */
export const TIME_SLOTS = (() => {
  const slots = [];
  for (let i = 0; i < 32; i++) {
    const hour = 8 + Math.floor(i / 2);
    if (hour >= 24) break;
    const minute = i % 2 === 0 ? 0 : 30;
    const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const ampm = hour >= 12 && hour < 24 ? "PM" : "AM";
    const label = `${h12}:${String(minute).padStart(2, "0")} ${ampm}`;
    slots.push({ value, label });
  }
  return slots;
})();

/** Payment method options for admin booking forms */
export const PAYMENT_METHODS = [
  { value: "stripe", label: "Stripe / Card" },
  { value: "cash", label: "Cash" },
  { value: "zelle", label: "Zelle" },
  { value: "venmo", label: "Venmo" },
  { value: "check", label: "Check" },
  { value: "other", label: "Other" },
] as const;

/** Booking status progression steps */
export const STATUS_STEPS = ["pending", "confirmed", "active", "completed", "cancelled", "no-show"] as const;
