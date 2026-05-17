-- Vehicle sales (admin bill of sale) — run in Supabase SQL editor

CREATE TABLE IF NOT EXISTS vehicle_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id TEXT NOT NULL UNIQUE REFERENCES vehicles(id) ON DELETE RESTRICT,
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

CREATE INDEX IF NOT EXISTS idx_vehicle_sales_vehicle_id ON vehicle_sales(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_sales_created_at ON vehicle_sales(created_at DESC);

-- Private bucket for bill-of-sale PDFs (admin signed URLs only)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('vehicle-sales', 'vehicle-sales', false, 10485760)
ON CONFLICT (id) DO NOTHING;
