-- Allow public checkout bookings to sit in pending_approval before staff
-- approve them. Production may already accept this value; this is idempotent.
DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname INTO conname
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND t.relname = 'bookings'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  ORDER BY c.conname
  LIMIT 1;

  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE bookings DROP CONSTRAINT %I', conname);
  END IF;
END $$;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'pending_approval',
    'pending',
    'confirmed',
    'active',
    'completed',
    'cancelled',
    'no-show'
  ));
