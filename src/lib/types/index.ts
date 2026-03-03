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
