-- Dual role (manager + owner): capability flags on customers
-- Run in Supabase SQL Editor after owner-portal and manager migrations.
--
-- Primary `role` stays a single value; `owner_portal_enabled` grants owner portal
-- access when primary role is manager (or another non-owner role).

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS owner_portal_enabled BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_customers_owner_portal_enabled
  ON customers (owner_portal_enabled)
  WHERE owner_portal_enabled = TRUE;

-- Existing owner accounts: ensure flag is set for consistent capability checks
UPDATE customers
SET owner_portal_enabled = TRUE
WHERE role = 'owner' AND (owner_portal_enabled IS NULL OR owner_portal_enabled = FALSE);
