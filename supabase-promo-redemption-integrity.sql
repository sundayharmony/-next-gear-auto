-- Apply this migration before deploying the promo redemption code.
-- It makes redemption counting atomic and idempotent per confirmed booking.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS promo_redemption_counted BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION redeem_booking_promo(p_booking_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booking_promo_code TEXT;
BEGIN
  SELECT promo_code
    INTO booking_promo_code
    FROM bookings
   WHERE id = p_booking_id
     AND status = 'confirmed'
     AND promo_code IS NOT NULL
     AND promo_redemption_counted = false
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE promo_codes
     SET used_count = COALESCE(used_count, 0) + 1
   WHERE code = booking_promo_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Promo code % not found for booking %',
      booking_promo_code, p_booking_id;
  END IF;

  UPDATE bookings
     SET promo_redemption_counted = true
   WHERE id = p_booking_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION redeem_booking_promo(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION redeem_booking_promo(TEXT) TO service_role;

CREATE OR REPLACE FUNCTION confirm_free_booking(p_booking_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE bookings
     SET status = 'confirmed',
         deposit = 0
   WHERE id = p_booking_id
     AND status = 'pending';

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  PERFORM redeem_booking_promo(p_booking_id);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION confirm_free_booking(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION confirm_free_booking(TEXT) TO service_role;
