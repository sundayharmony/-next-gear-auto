-- ============================================================
-- Turo Calendar Sync: Database Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Create blocked_dates table for external calendar blocks
CREATE TABLE IF NOT EXISTS blocked_dates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,        -- YYYY-MM-DD format (matches bookings table)
  end_date TEXT NOT NULL,          -- YYYY-MM-DD format
  source TEXT NOT NULL DEFAULT 'manual',  -- 'turo', 'manual', 'getaround', etc.
  external_event_uid TEXT,         -- UID from the iCal event (for dedup on re-sync)
  summary TEXT,                    -- Event summary/title from iCal
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by vehicle + date overlap
CREATE INDEX IF NOT EXISTS idx_blocked_dates_vehicle_dates
  ON blocked_dates (vehicle_id, start_date, end_date);

-- Index for fast lookups by source + external UID (dedup)
CREATE UNIQUE INDEX IF NOT EXISTS idx_blocked_dates_source_uid
  ON blocked_dates (vehicle_id, source, external_event_uid)
  WHERE external_event_uid IS NOT NULL;

-- 2. Add turo_ical_url column to vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS turo_ical_url TEXT;

-- 3. Add last sync timestamp to vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS turo_last_synced_at TIMESTAMPTZ;

-- 4. Enable RLS on blocked_dates
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (our API uses service role key)
CREATE POLICY "Service role full access on blocked_dates"
  ON blocked_dates
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Anon/authenticated can read (for public availability checks)
CREATE POLICY "Public read access on blocked_dates"
  ON blocked_dates
  FOR SELECT
  USING (true);
