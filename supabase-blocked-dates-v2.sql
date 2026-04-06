-- ============================================================
-- Blocked Dates v2: Add time, location, and earnings columns
-- Run this in the Supabase SQL Editor
-- ============================================================

ALTER TABLE blocked_dates
  ADD COLUMN IF NOT EXISTS pickup_time TEXT,    -- e.g. "8:00 AM"
  ADD COLUMN IF NOT EXISTS return_time TEXT,    -- e.g. "10:00 AM"
  ADD COLUMN IF NOT EXISTS location TEXT,       -- e.g. "Newark, NJ Newark Liberty International Airport"
  ADD COLUMN IF NOT EXISTS earnings NUMERIC;    -- e.g. 111.70
