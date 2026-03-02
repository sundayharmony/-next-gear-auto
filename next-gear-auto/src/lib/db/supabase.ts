import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client (uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client (uses service role key for admin operations)
export function getServiceSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    // Fall back to anon key if service key not set
    return supabase;
  }
  return createClient(supabaseUrl, serviceKey);
}

// Database types matching our schema
export interface DbCustomer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  dob: string | null;
  password_hash: string | null;
  role: "customer" | "admin";
  driver_license: Record<string, unknown> | null;
  created_at: string;
}

export interface DbVehicle {
  id: string;
  name: string;
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
  weekly_rate: number;
  monthly_rate: number;
  features: string[];
  is_available: boolean;
  description: string | null;
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
  extras: Record<string, unknown>[];
  total_price: number;
  deposit: number;
  status: string;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  signed_name: string | null;
  agreement_signed_at: string | null;
  created_at: string;
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
