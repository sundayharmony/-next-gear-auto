-- ============================================
-- Fix 1: Create promo_codes table in Supabase
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

-- Seed the existing promo codes
INSERT INTO promo_codes (code, discount_type, discount_value, min_booking_amount, max_uses, used_count, expires_at, description, is_active)
VALUES
  ('WELCOME10', 'percentage', 10, 50, 100, 12, '2026-12-31', '10% off for new customers', true),
  ('SUMMER25', 'fixed', 25, 100, 50, 8, '2026-09-30', '$25 off summer rentals', true),
  ('LONGTERM15', 'percentage', 15, 200, 30, 3, '2026-12-31', '15% off rentals over $200', true),
  ('WEEKEND50', 'fixed', 50, 150, 20, 5, '2026-06-30', '$50 off weekend rentals', true)
ON CONFLICT (code) DO NOTHING;


-- ============================================
-- Fix 2: Create vehicles table and seed data
-- ============================================
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  images JSONB DEFAULT '[]',
  specs JSONB DEFAULT '{}',
  daily_rate NUMERIC NOT NULL,
  weekly_rate NUMERIC NOT NULL,
  monthly_rate NUMERIC NOT NULL,
  features JSONB DEFAULT '[]',
  is_available BOOLEAN DEFAULT true,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the 6 vehicles
INSERT INTO vehicles (id, name, category, images, specs, daily_rate, weekly_rate, monthly_rate, features, is_available, description)
VALUES
  ('v1', 'Toyota Corolla', 'compact', '["\/images\/vehicles\/corolla.svg"]', '{"passengers":5,"luggage":2,"transmission":"Automatic","fuelType":"Gasoline","mpg":35,"doors":4}', 35, 210, 750, '["Bluetooth","Backup Camera","Apple CarPlay","USB Charging","Cruise Control"]', true, 'Perfect for city driving and everyday commutes. The Toyota Corolla offers excellent fuel economy and a comfortable ride.'),
  ('v2', 'Honda Civic', 'compact', '["\/images\/vehicles\/civic.svg"]', '{"passengers":5,"luggage":2,"transmission":"Automatic","fuelType":"Gasoline","mpg":36,"doors":4}', 35, 210, 750, '["Bluetooth","Lane Assist","Android Auto","Apple CarPlay","Adaptive Cruise Control"]', true, 'A reliable and fun-to-drive compact car with excellent safety features and modern technology.'),
  ('v3', 'Toyota Camry', 'sedan', '["\/images\/vehicles\/camry.svg"]', '{"passengers":5,"luggage":3,"transmission":"Automatic","fuelType":"Gasoline","mpg":32,"doors":4}', 50, 300, 1050, '["Leather Seats","Sunroof","Blind Spot Monitor","Wireless Charging","Premium Audio"]', true, 'Spacious and refined sedan perfect for business travel and long drives. Premium comfort for any occasion.'),
  ('v4', 'Toyota RAV4', 'suv', '["\/images\/vehicles\/rav4.svg"]', '{"passengers":5,"luggage":4,"transmission":"Automatic","fuelType":"Gasoline","mpg":30,"doors":4}', 65, 390, 1350, '["All-Wheel Drive","Roof Rails","Power Liftgate","360 Camera","Trail Mode"]', true, 'Versatile SUV with all-wheel drive, perfect for family trips and outdoor adventures.'),
  ('v5', 'Ford Explorer', 'suv', '["\/images\/vehicles\/explorer.svg"]', '{"passengers":7,"luggage":6,"transmission":"Automatic","fuelType":"Gasoline","mpg":27,"doors":4}', 75, 450, 1575, '["Third Row Seating","4WD","Towing Package","Heated Seats","SYNC 4 Infotainment"]', true, 'Full-size SUV with three rows of seating. Ideal for large groups and family vacations.'),
  ('v6', 'Ford F-150', 'truck', '["\/images\/vehicles\/f150.svg"]', '{"passengers":5,"luggage":0,"transmission":"Automatic","fuelType":"Gasoline","mpg":24,"doors":4}', 70, 420, 1470, '["4x4","Tow Package","Bed Liner","Pro Power Onboard","Trailer Backup Assist"]', true, 'America''s best-selling truck. Perfect for hauling, towing, and getting the job done.')
ON CONFLICT (id) DO NOTHING;


-- ============================================
-- Fix 5: Clean up old admin from customers table
-- ============================================
DELETE FROM customers WHERE email = 'admin@nextgearauto.com';


-- ============================================
-- Create reviews table if it doesn't exist
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
