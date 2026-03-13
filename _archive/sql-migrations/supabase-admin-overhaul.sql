-- ============================================
-- NextGearAuto Admin Panel Overhaul
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. Restructure vehicles table: add year/make/model, remove weekly/monthly
-- ============================================

-- Add new columns
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS year INTEGER DEFAULT 2024;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS make TEXT DEFAULT '';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS model TEXT DEFAULT '';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS mileage INTEGER DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS license_plate TEXT DEFAULT '';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vin TEXT DEFAULT '';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS maintenance_status TEXT DEFAULT 'good';

-- Migrate existing name data → year/make/model
-- (This handles the 6 vehicles we seeded earlier)
UPDATE vehicles SET year = 2024, make = 'Toyota', model = 'Corolla', color = 'Silver', mileage = 12500, license_plate = 'NGA-001', vin = '2T1BURHE0NC123456' WHERE id = 'v1';
UPDATE vehicles SET year = 2024, make = 'Honda', model = 'Civic', color = 'White', mileage = 8200, license_plate = 'NGA-002', vin = '19XFL1H76NE234567' WHERE id = 'v2';
UPDATE vehicles SET year = 2024, make = 'Toyota', model = 'Camry', color = 'Black', mileage = 15800, license_plate = 'NGA-003', vin = '4T1BZ1HK0NU345678' WHERE id = 'v3';
UPDATE vehicles SET year = 2024, make = 'Toyota', model = 'RAV4', color = 'Blue', mileage = 22100, license_plate = 'NGA-004', vin = '2T3P1RFV0NW456789' WHERE id = 'v4';
UPDATE vehicles SET year = 2024, make = 'Ford', model = 'Explorer', color = 'Red', mileage = 18400, license_plate = 'NGA-005', vin = '1FMSK8DH0NGA56789' WHERE id = 'v5';
UPDATE vehicles SET year = 2024, make = 'Ford', model = 'F-150', color = 'Gray', mileage = 25600, license_plate = 'NGA-006', vin = '1FTFW1E82NFA67890' WHERE id = 'v6';

-- Drop weekly and monthly rate columns (data only, no longer used)
ALTER TABLE vehicles DROP COLUMN IF EXISTS weekly_rate;
ALTER TABLE vehicles DROP COLUMN IF EXISTS monthly_rate;

-- Drop old name column (replaced by year+make+model)
ALTER TABLE vehicles DROP COLUMN IF EXISTS name;


-- ============================================
-- 2. Create expenses table for financial tracking
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'other',
  amount NUMERIC NOT NULL,
  description TEXT DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed some sample expenses for testing
INSERT INTO expenses (id, vehicle_id, category, amount, description, date)
VALUES
  ('exp1', 'v1', 'maintenance', 120.00, 'Oil change and tire rotation', '2026-01-15'),
  ('exp2', 'v3', 'fuel', 85.50, 'Fuel refill after rental', '2026-02-01'),
  ('exp3', 'v4', 'cleaning', 45.00, 'Interior deep clean', '2026-02-10'),
  ('exp4', 'v5', 'insurance', 250.00, 'Monthly insurance premium', '2026-02-01'),
  ('exp5', 'v6', 'maintenance', 350.00, 'Brake pad replacement', '2026-02-20'),
  ('exp6', NULL, 'other', 150.00, 'Office supplies and software', '2026-02-15')
ON CONFLICT (id) DO NOTHING;


-- ============================================
-- 3. Create promo_codes table (if not already created)
-- ============================================
CREATE TABLE IF NOT EXISTS promo_codes (
  code TEXT PRIMARY KEY,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL DEFAULT 10,
  min_booking_amount NUMERIC DEFAULT 0,
  max_uses INTEGER DEFAULT 100,
  used_count INTEGER DEFAULT 0,
  expires_at TEXT,
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO promo_codes (code, discount_type, discount_value, min_booking_amount, max_uses, used_count, expires_at, description, is_active)
VALUES
  ('WELCOME10', 'percentage', 10, 50, 100, 12, '2026-12-31', '10% off for new customers', true),
  ('SUMMER25', 'fixed', 25, 100, 50, 8, '2026-09-30', '$25 off summer rentals', true),
  ('LONGTERM15', 'percentage', 15, 200, 30, 3, '2026-12-31', '15% off rentals over $200', true),
  ('WEEKEND50', 'fixed', 50, 150, 20, 5, '2026-06-30', '$50 off weekend rentals', true)
ON CONFLICT (code) DO NOTHING;


-- ============================================
-- 4. Create reviews table (if not already created)
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  vehicle_id TEXT NOT NULL,
  booking_id TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================
-- 5. Create admins table (if not already created)
-- ============================================
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT DEFAULT '',
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================
-- 6. Cleanup: remove admin from customers table
-- ============================================
DELETE FROM customers WHERE email = 'admin@nextgearauto.com';


-- ============================================
-- 7. Create Supabase Storage bucket for vehicle images
-- (This needs to be done through Supabase Dashboard > Storage)
-- Go to: Storage > New Bucket > Name: "vehicle-images" > Public: ON
-- ============================================
-- NOTE: Run this if your Supabase version supports it via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-images', 'vehicle-images', true)
ON CONFLICT (id) DO NOTHING;
