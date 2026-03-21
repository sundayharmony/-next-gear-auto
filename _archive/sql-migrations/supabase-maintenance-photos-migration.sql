-- Migration: Rename receipt_urls to photo_urls in maintenance_records
-- Run this in Supabase SQL Editor BEFORE deploying code changes

-- Step 1: Add new photo_urls column
ALTER TABLE maintenance_records ADD COLUMN photo_urls TEXT[] DEFAULT '{}';

-- Step 2: Copy existing data
UPDATE maintenance_records SET photo_urls = receipt_urls WHERE receipt_urls IS NOT NULL;

-- Step 3: Drop old column
ALTER TABLE maintenance_records DROP COLUMN receipt_urls;
