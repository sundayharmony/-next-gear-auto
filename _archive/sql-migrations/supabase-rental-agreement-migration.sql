-- Add rental_agreement_url column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rental_agreement_url TEXT;

-- Create booking-documents storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('booking-documents', 'booking-documents', true, 10485760)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read access to booking-documents bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Public read access for booking documents'
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Public read access for booking documents"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'booking-documents');
  END IF;
END $$;

-- Allow service role full access to booking-documents bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Service role can manage booking documents'
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Service role can manage booking documents"
    ON storage.objects FOR ALL
    USING (bucket_id = 'booking-documents')
    WITH CHECK (bucket_id = 'booking-documents');
  END IF;
END $$;
