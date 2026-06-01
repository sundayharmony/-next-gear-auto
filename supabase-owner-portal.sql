-- ============================================================
-- Owner Portal (Arbitrage Panel): Database Migration
-- Run this in the Supabase SQL Editor.
--
-- Adds:
--   1. 'owner' role support on the customers table
--   2. Vehicle ownership + revenue-share columns
--   3. owner_payouts table (per-booking payout records)
--   4. owner_notifications table (owner-facing notifications)
--   5. 'owner' as a valid blocked_dates source + owner attribution
-- ============================================================

-- ── 1. Allow the 'owner' role on customers ──────────────────────────
-- The customers.role column is free-form text in this schema. If a CHECK
-- constraint exists that restricts it, widen it to include 'owner'.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'customers' AND column_name = 'role'
  ) THEN
    BEGIN
      ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_role_check;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

ALTER TABLE customers
  ADD CONSTRAINT customers_role_check
  CHECK (role IN ('customer', 'admin', 'manager', 'owner'));

-- ── 2. Vehicle ownership + revenue share ────────────────────────────
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS owner_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_percentage NUMERIC NOT NULL DEFAULT 70;

CREATE INDEX IF NOT EXISTS idx_vehicles_owner_id ON vehicles (owner_id);

-- ── 3. owner_payouts: one payout record per booking ─────────────────
CREATE TABLE IF NOT EXISTS owner_payouts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  booking_id TEXT REFERENCES bookings(id) ON DELETE CASCADE,
  gross_revenue NUMERIC NOT NULL DEFAULT 0,
  platform_fees NUMERIC NOT NULL DEFAULT 0,
  processing_fees NUMERIC NOT NULL DEFAULT 0,
  other_expenses NUMERIC NOT NULL DEFAULT 0,
  net_revenue NUMERIC NOT NULL DEFAULT 0,
  owner_percentage NUMERIC NOT NULL DEFAULT 70,
  owner_payout NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'issued' | 'paid'
  payout_date TEXT,                        -- YYYY-MM-DD when issued/paid
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_owner_payouts_booking ON owner_payouts (booking_id);
CREATE INDEX IF NOT EXISTS idx_owner_payouts_owner ON owner_payouts (owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_payouts_status ON owner_payouts (status);

ALTER TABLE owner_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on owner_payouts" ON owner_payouts;
CREATE POLICY "Service role full access on owner_payouts"
  ON owner_payouts FOR ALL USING (true) WITH CHECK (true);

-- ── 4. owner_notifications ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS owner_notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,            -- 'booking_created' | 'booking_modified' | 'booking_cancelled' | 'payout_issued' | 'availability_changed'
  title TEXT NOT NULL,
  message TEXT,
  booking_id TEXT,
  vehicle_id TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_owner_notifications_owner
  ON owner_notifications (owner_id, is_read, created_at DESC);

ALTER TABLE owner_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on owner_notifications" ON owner_notifications;
CREATE POLICY "Service role full access on owner_notifications"
  ON owner_notifications FOR ALL USING (true) WITH CHECK (true);

-- ── 5. Owner attribution on blocked_dates ───────────────────────────
-- 'owner' joins 'manual' / 'turo-email' as a valid source. owner_id lets the
-- owner manage only the blocks they created.
ALTER TABLE blocked_dates
  ADD COLUMN IF NOT EXISTS owner_id TEXT REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_blocked_dates_owner ON blocked_dates (owner_id);
