-- Add password_hash column to customers table (if not already present)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Optional: verify the column was added
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'customers' AND column_name = 'password_hash';
