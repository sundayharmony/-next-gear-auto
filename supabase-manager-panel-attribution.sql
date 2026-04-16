-- ============================================================================
-- Manager panel attribution + access migration
-- Created: 2026-04-15
-- Purpose:
--   1) Add booking source attribution fields for scoped manager analytics
--   2) Add manager access lifecycle fields to customers
-- ============================================================================

-- ── Bookings attribution fields (additive + backward compatible) ───────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS origin_channel TEXT DEFAULT 'unknown';

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS created_by_role TEXT;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS created_by_user_id TEXT;

-- Normalize unknown NULL values for existing rows
UPDATE bookings
SET origin_channel = COALESCE(origin_channel, 'unknown')
WHERE origin_channel IS NULL;

-- Guardrail checks (NOT VALID to avoid blocking legacy rows unexpectedly)
-- Idempotent: PostgreSQL has no IF NOT EXISTS for constraints; skip if already applied.
DO $$
BEGIN
  ALTER TABLE bookings
    ADD CONSTRAINT bookings_origin_channel_check
    CHECK (origin_channel IN ('public_checkout', 'admin_panel', 'manager_panel', 'unknown')) NOT VALID;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE bookings
    ADD CONSTRAINT bookings_created_by_role_check
    CHECK (created_by_role IS NULL OR created_by_role IN ('admin', 'manager', 'customer')) NOT VALID;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_origin_channel ON bookings(origin_channel);
CREATE INDEX IF NOT EXISTS idx_bookings_created_by_user_id ON bookings(created_by_user_id);

-- ── Manager account lifecycle fields (admin-controlled) ─────────────────────
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS manager_access_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS manager_access_granted_at TIMESTAMPTZ;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS manager_access_revoked_at TIMESTAMPTZ;

-- Keep role list constrained (skip if a prior migration already added this check)
DO $$
BEGIN
  ALTER TABLE customers
    ADD CONSTRAINT customers_role_check
    CHECK (role IN ('customer', 'admin', 'manager')) NOT VALID;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_role ON customers(role);
CREATE INDEX IF NOT EXISTS idx_customers_manager_access_enabled ON customers(manager_access_enabled);
