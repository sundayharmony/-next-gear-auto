-- ============================================
-- NextGearAuto Database Schema for Supabase
-- Run this in Supabase SQL Editor (Dashboard > SQL)
-- ============================================

-- 1. Customers table
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY DEFAULT 'c' || extract(epoch from now())::bigint::text || floor(random() * 1000)::text,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  dob TEXT,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  driver_license JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('compact', 'sedan', 'suv', 'truck')),
  images JSONB DEFAULT '[]'::jsonb,
  specs JSONB NOT NULL,
  daily_rate NUMERIC(10,2) NOT NULL,
  weekly_rate NUMERIC(10,2) NOT NULL,
  monthly_rate NUMERIC(10,2) NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  is_available BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY DEFAULT 'bk' || extract(epoch from now())::bigint::text || floor(random() * 1000)::text,
  customer_id TEXT REFERENCES customers(id),
  vehicle_id TEXT REFERENCES vehicles(id),
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  pickup_date TEXT NOT NULL,
  return_date TEXT NOT NULL,
  extras JSONB DEFAULT '[]'::jsonb,
  total_price NUMERIC(10,2) NOT NULL,
  deposit NUMERIC(10,2) DEFAULT 50.00,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'no-show')),
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  signed_name TEXT,
  agreement_signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Payment records table
CREATE TABLE IF NOT EXISTS payment_records (
  id TEXT PRIMARY KEY DEFAULT 'pay' || extract(epoch from now())::bigint::text || floor(random() * 1000)::text,
  booking_id TEXT REFERENCES bookings(id),
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle ON bookings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(pickup_date, return_date);
CREATE INDEX IF NOT EXISTS idx_bookings_stripe ON bookings(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_payment_records_booking ON payment_records(booking_id);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies - Allow anonymous access for the app (using anon key)
-- Vehicles: anyone can read
CREATE POLICY "Vehicles are viewable by everyone" ON vehicles FOR SELECT USING (true);

-- Customers: allow insert (signup) and select (login) via anon
CREATE POLICY "Allow customer signup" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow customer lookup" ON customers FOR SELECT USING (true);
CREATE POLICY "Allow customer update" ON customers FOR UPDATE USING (true);

-- Bookings: allow insert and select via anon (app handles auth)
CREATE POLICY "Allow booking creation" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow booking read" ON bookings FOR SELECT USING (true);
CREATE POLICY "Allow booking update" ON bookings FOR UPDATE USING (true);

-- Payment records: allow insert and select
CREATE POLICY "Allow payment record creation" ON payment_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow payment record read" ON payment_records FOR SELECT USING (true);
CREATE POLICY "Allow payment record update" ON payment_records FOR UPDATE USING (true);

-- ============================================
-- SEED DATA: Vehicles
-- ============================================
INSERT INTO vehicles (id, name, category, images, specs, daily_rate, weekly_rate, monthly_rate, features, is_available, description) VALUES
('v1', 'Toyota Corolla', 'compact', '["\/images\/vehicles\/corolla.svg"]'::jsonb,
 '{"passengers": 5, "luggage": 2, "transmission": "Automatic", "fuelType": "Gasoline", "mpg": 35, "doors": 4}'::jsonb,
 35, 210, 750,
 '["Bluetooth", "Backup Camera", "Apple CarPlay", "USB Charging", "Cruise Control"]'::jsonb,
 true, 'Perfect for city driving and everyday commutes. The Toyota Corolla offers excellent fuel economy and a comfortable ride.'),

('v2', 'Honda Civic', 'compact', '["\/images\/vehicles\/civic.svg"]'::jsonb,
 '{"passengers": 5, "luggage": 2, "transmission": "Automatic", "fuelType": "Gasoline", "mpg": 36, "doors": 4}'::jsonb,
 35, 210, 750,
 '["Bluetooth", "Lane Assist", "Android Auto", "Apple CarPlay", "Adaptive Cruise Control"]'::jsonb,
 true, 'A reliable and fun-to-drive compact car with excellent safety features and modern technology.'),

('v3', 'Toyota Camry', 'sedan', '["\/images\/vehicles\/camry.svg"]'::jsonb,
 '{"passengers": 5, "luggage": 3, "transmission": "Automatic", "fuelType": "Gasoline", "mpg": 32, "doors": 4}'::jsonb,
 50, 300, 1050,
 '["Leather Seats", "Sunroof", "Blind Spot Monitor", "Wireless Charging", "Premium Audio"]'::jsonb,
 true, 'Spacious and refined sedan perfect for business travel and long drives. Premium comfort for any occasion.'),

('v4', 'Toyota RAV4', 'suv', '["\/images\/vehicles\/rav4.svg"]'::jsonb,
 '{"passengers": 5, "luggage": 4, "transmission": "Automatic", "fuelType": "Gasoline", "mpg": 30, "doors": 4}'::jsonb,
 65, 390, 1350,
 '["All-Wheel Drive", "Roof Rails", "Power Liftgate", "360 Camera", "Trail Mode"]'::jsonb,
 true, 'Versatile SUV with all-wheel drive, perfect for family trips and outdoor adventures.'),

('v5', 'Ford Explorer', 'suv', '["\/images\/vehicles\/explorer.svg"]'::jsonb,
 '{"passengers": 7, "luggage": 6, "transmission": "Automatic", "fuelType": "Gasoline", "mpg": 27, "doors": 4}'::jsonb,
 75, 450, 1575,
 '["Third Row Seating", "4WD", "Towing Package", "Heated Seats", "SYNC 4 Infotainment"]'::jsonb,
 true, 'Full-size SUV with three rows of seating. Ideal for large groups and family vacations.'),

('v6', 'Ford F-150', 'truck', '["\/images\/vehicles\/f150.svg"]'::jsonb,
 '{"passengers": 5, "luggage": 0, "transmission": "Automatic", "fuelType": "Gasoline", "mpg": 24, "doors": 4}'::jsonb,
 70, 420, 1470,
 '["4x4", "Tow Package", "Bed Liner", "Pro Power Onboard", "Trailer Backup Assist"]'::jsonb,
 true, 'America''s best-selling truck. Perfect for hauling, towing, and getting the job done.')
ON CONFLICT (id) DO NOTHING;

-- Seed admin user
INSERT INTO customers (id, name, email, phone, dob, role) VALUES
('admin1', 'Admin User', 'admin@nextgearauto.com', '(555) 000-0000', '1985-01-01', 'admin')
ON CONFLICT (id) DO NOTHING;

-- Seed sample customers
INSERT INTO customers (id, name, email, phone, dob, role) VALUES
('c1', 'Sarah Johnson', 'sarah.johnson@example.com', '(555) 123-4567', '1990-05-15', 'customer'),
('c2', 'Michael Chen', 'michael.chen@example.com', '(555) 234-5678', '1988-11-22', 'customer')
ON CONFLICT (id) DO NOTHING;
