import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client (uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client (uses service role key for admin operations)
export function getServiceSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SUPABASE_SERVICE_KEY is required in production");
    }
    // Fall back to anon key in development only
    console.warn("SUPABASE_SERVICE_KEY not set — falling back to anon key (dev only)");
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
