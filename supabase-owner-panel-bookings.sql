-- Allow bookings created from the owner portal to be tagged separately.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_origin_channel_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_origin_channel_check
  CHECK (origin_channel IN (
    'public_checkout',
    'admin_panel',
    'manager_panel',
    'owner_panel',
    'unknown'
  )) NOT VALID;
