-- Add is_published column to vehicles table
-- Allows hiding test/placeholder vehicles from customer-facing pages
-- while keeping them visible in the admin dashboard

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

-- Set the sample/placeholder vehicle to unpublished
-- (Adjust the WHERE clause if the sample vehicle has different data)
UPDATE vehicles SET is_published = false WHERE make ILIKE '%sample%' OR model ILIKE '%sample%' OR daily_rate = 0;
