-- Company-owned vehicles: fleet units with no external owner payout.
-- Run in the Supabase SQL Editor.
--
-- Distinct from "unassigned" (owner_id IS NULL, is_company_owned = false):
--   unassigned     → not yet linked to an owner or the company
--   company-owned  → owner_id IS NULL, is_company_owned = true (platform retains 100%)

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS is_company_owned BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_vehicles_company_owned
  ON vehicles (is_company_owned)
  WHERE is_company_owned = true;
