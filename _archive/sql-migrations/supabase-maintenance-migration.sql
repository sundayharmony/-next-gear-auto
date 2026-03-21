-- Migration: Add maintenance records, booking document fields
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

-- 1. Create maintenance_records table
CREATE TABLE IF NOT EXISTS maintenance_records (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT REFERENCES vehicles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
  cost DECIMAL(10,2),
  receipt_urls TEXT[] DEFAULT '{}',
  scheduled_date TEXT,
  started_date TEXT,
  completed_date TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add new columns to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS id_document_url TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS insurance_proof_url TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS insurance_opted_out BOOLEAN DEFAULT false;

-- 3. Enable RLS on maintenance_records (service role bypasses)
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;

-- 4. Allow service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'maintenance_records' AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access" ON maintenance_records FOR ALL USING (true);
  END IF;
END
$$;

-- Add pickup and return time columns to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_time TEXT DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS return_time TEXT DEFAULT NULL;

-- 5. Create instagram_posts table for the social feed
CREATE TABLE IF NOT EXISTS instagram_posts (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  caption TEXT,
  thumbnail_url TEXT,
  media_type TEXT DEFAULT 'image',
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add thumbnail columns if table already exists
ALTER TABLE instagram_posts ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE instagram_posts ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image';

-- Enable RLS on instagram_posts
ALTER TABLE instagram_posts ENABLE ROW LEVEL SECURITY;

-- Allow public read access to visible posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'instagram_posts' AND policyname = 'Public read visible posts'
  ) THEN
    CREATE POLICY "Public read visible posts" ON instagram_posts FOR SELECT USING (is_visible = true);
  END IF;
END
$$;

-- Allow service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'instagram_posts' AND policyname = 'Service role full access instagram'
  ) THEN
    CREATE POLICY "Service role full access instagram" ON instagram_posts FOR ALL USING (true);
  END IF;
END
$$;
