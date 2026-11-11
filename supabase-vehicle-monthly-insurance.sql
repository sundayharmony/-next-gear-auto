-- Monthly insurance cost per vehicle (used by weekly owner settlement tracker).
-- Run in Supabase SQL Editor if the column is not already present.

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS monthly_insurance NUMERIC NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.vehicles.monthly_insurance IS
  'Monthly insurance premium for the vehicle; weekly owner settlement prorates this Mon–Sun.';
