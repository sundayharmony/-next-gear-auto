-- Add profile_picture_url column to customers table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT DEFAULT NULL;

-- Optional: Create the profile-pictures storage bucket if it doesn't exist
-- (The API auto-creates it, but you can also do it manually in Supabase Dashboard > Storage)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit)
-- VALUES ('profile-pictures', 'profile-pictures', true, 2097152)
-- ON CONFLICT (id) DO NOTHING;
