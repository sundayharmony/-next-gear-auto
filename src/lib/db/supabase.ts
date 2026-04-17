import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseAnonKey) {
  throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

// ---------------------------------------------------------------------------
// Minimal Database type so Supabase returns real row types instead of `never`.
// Keys match the Postgres table names used across the app.  Every table that
// appears in a `.from("…")` call MUST be listed here.
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
type GenericTable = {
  Row: any;
  Insert: any;
  Update: any;
  Relationships: any[];
};

type Database = {
  public: {
    Tables: {
      admins: GenericTable;
      customers: GenericTable;
      vehicles: GenericTable;
      bookings: GenericTable;
      blocked_dates: GenericTable;
      payment_records: GenericTable;
      booking_payments: GenericTable;
      promo_codes: GenericTable;
      reviews: GenericTable;
      tickets: GenericTable;
      expenses: GenericTable;
      maintenance_records: GenericTable;
      instagram_posts: GenericTable;
      locations: GenericTable;
      booking_activity: GenericTable;
      message_threads: GenericTable;
      message_thread_members: GenericTable;
      messages: GenericTable;
      notification_outbox: GenericTable;
      push_subscriptions: GenericTable;
    };
    Views: Record<string, never>;
    Functions: {
      staff_message_thread_unread_counts: {
        Args: { p_user_id: string; p_thread_ids: string[] };
        Returns: { thread_id: string; unread_count: number }[];
      };
      staff_get_or_create_dm_thread: {
        Args: {
          p_low: string;
          p_high: string;
          p_creator_user_id: string;
          p_creator_role: string;
          p_peer_user_id: string;
          p_peer_role: string;
        };
        Returns: { thread_id: string; created_new: boolean }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
/* eslint-enable @typescript-eslint/no-explicit-any */

// Client-side Supabase client (uses anon key)
export const supabase = createClient<Database>(supabaseUrl as string, supabaseAnonKey as string);

// Server-side Supabase client (uses service role key for admin operations)
// Cached as singleton — safe in serverless because each cold start gets a fresh module scope
let _serviceClient: ReturnType<typeof createClient<Database>> | null = null;
let _cachedServiceKey: string | undefined = undefined;
let _cachedSupabaseUrl: string | undefined = undefined;

export function getServiceSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const currentSupabaseUrl = supabaseUrl;

  // Detect stale singleton: if environment variables have changed, create a new client
  if (
    _serviceClient &&
    _cachedServiceKey === serviceKey &&
    _cachedSupabaseUrl === currentSupabaseUrl
  ) {
    return _serviceClient;
  }

  if (!serviceKey) {
    // Require service key for all environments (admin operations must not use anon key)
    throw new Error("SUPABASE_SERVICE_KEY environment variable is required for admin operations");
  }
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required to create service client");
  }
  _serviceClient = createClient<Database>(supabaseUrl, serviceKey);
  _cachedServiceKey = serviceKey;
  _cachedSupabaseUrl = currentSupabaseUrl;
  return _serviceClient;
}

// Database types matching our schema
export interface DbCustomer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  dob: string | null;
  password_hash: string | null;
  role: "customer" | "admin" | "manager";
  driver_license: Record<string, unknown> | null;
  profile_picture_url: string | null;
  created_at: string;
}

export interface DbVehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  category: string;
  images: string[];
  specs: {
    passengers: number;
    luggage: number;
    transmission: string;
    fuelType: string;
    mpg: number;
    doors: number;
  };
  daily_rate: number;
  features: string[];
  is_available: boolean;
  description: string | null;
  color: string | null;
  mileage: number;
  license_plate: string | null;
  vin: string | null;
  maintenance_status: string;
  created_at: string;
}

export interface DbBooking {
  id: string;
  customer_id: string | null;
  vehicle_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  pickup_date: string;
  return_date: string;
  pickup_time: string | null;
  return_time: string | null;
  extras: Record<string, unknown>[];
  total_price: number;
  deposit: number;
  status: string;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  signed_name: string | null;
  agreement_signed_at: string | null;
  created_at: string;
  pickup_location_id: string | null;
  return_location_id: string | null;
  location_surcharge: number | null;
  origin_channel: "public_checkout" | "admin_panel" | "manager_panel" | "unknown" | null;
  created_by_role: "admin" | "manager" | "customer" | null;
  created_by_user_id: string | null;
}

export interface DbPaymentRecord {
  id: string;
  booking_id: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  amount: number;
  status: string;
  created_at: string;
}
