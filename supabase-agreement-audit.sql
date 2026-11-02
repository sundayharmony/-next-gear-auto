-- Rental agreement signing audit fields (optional; signing still logs to booking_activity if columns missing)

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS agreement_version text,
ADD COLUMN IF NOT EXISTS agreement_content_hash text,
ADD COLUMN IF NOT EXISTS signed_ip text,
ADD COLUMN IF NOT EXISTS signed_user_agent text;
