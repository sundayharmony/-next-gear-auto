-- Add purchase_price column to vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(10,2) DEFAULT 0;
