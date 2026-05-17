-- Vehicle sales (admin bill of sale) — run in Supabase SQL editor
--
-- PREREQUISITE: The NGA app expects a public.vehicles table. If you get
-- "relation vehicles does not exist", either:
--   (A) Run on the Supabase project your site uses (check NEXT_PUBLIC_SUPABASE_URL), or
--   (B) Create vehicles first — see _archive/sql-migrations/supabase-fix-admin-panel.sql
--       and supabase-admin-overhaul.sql for column upgrades.
--
-- Check existing tables:
--   SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

CREATE TABLE IF NOT EXISTS vehicle_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id TEXT NOT NULL UNIQUE,
  sale_date DATE NOT NULL,
  sale_price NUMERIC(12, 2) NOT NULL CHECK (sale_price > 0),
  buyer_name TEXT NOT NULL,
  buyer_address TEXT NOT NULL,
  buyer_phone TEXT,
  buyer_email TEXT,
  odometer INTEGER,
  payment_method TEXT,
  notes TEXT,
  pdf_path TEXT NOT NULL,
  created_by_admin_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional FK when vehicles table exists (safe to re-run)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'vehicles'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'vehicle_sales'
      AND constraint_name = 'vehicle_sales_vehicle_id_fkey'
  ) THEN
    ALTER TABLE vehicle_sales
      ADD CONSTRAINT vehicle_sales_vehicle_id_fkey
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vehicle_sales_vehicle_id ON vehicle_sales(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_sales_created_at ON vehicle_sales(created_at DESC);

-- Private bucket for bill-of-sale PDFs (admin signed URLs only)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('vehicle-sales', 'vehicle-sales', false, 10485760)
ON CONFLICT (id) DO NOTHING;
