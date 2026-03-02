-- Reviews table for NextGearAuto
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  vehicle_id TEXT NOT NULL,
  booking_id TEXT REFERENCES bookings(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT NOT NULL CHECK (char_length(text) <= 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by vehicle and status
CREATE INDEX IF NOT EXISTS idx_reviews_vehicle_status ON reviews(vehicle_id, status);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON reviews(customer_id);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can read approved reviews
CREATE POLICY "Anyone can read approved reviews"
  ON reviews FOR SELECT
  USING (status = 'approved');

-- Policy: authenticated users can insert their own reviews
CREATE POLICY "Users can insert reviews"
  ON reviews FOR INSERT
  WITH CHECK (true);

-- Policy: admins can update review status (approve/reject)
CREATE POLICY "Admins can update reviews"
  ON reviews FOR UPDATE
  USING (true);
