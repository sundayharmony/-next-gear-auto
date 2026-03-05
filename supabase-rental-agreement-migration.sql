-- Add rental_agreement_url column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rental_agreement_url TEXT;

-- Create booking-documents storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('booking-documents', 'booking-documents', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Allow service role to manage booking-documents bucket
CREATE POLICY IF NOT EXISTS "Service role can manage booking documents"
ON storage.objects
FOR ALL
USING (bucket_id = 'booking-documents')
WITH CHECK (bucket_id = 'booking-documents');
