-- Migration: Add insurance_card_urls column to vehicles table
-- This stores an array of URLs for insurance card images

ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS insurance_card_urls JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN vehicles.insurance_card_urls IS 'Array of URLs for vehicle insurance card images';
