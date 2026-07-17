-- Apply after supabase-promo-redemption-integrity.sql
-- Referral promo codes + customer account credit ledger

ALTER TABLE promo_codes
  ADD COLUMN IF NOT EXISTS promo_type TEXT NOT NULL DEFAULT 'campaign',
  ADD COLUMN IF NOT EXISTS owner_customer_id TEXT REFERENCES customers(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_referral_owner
  ON promo_codes(owner_customer_id)
  WHERE promo_type = 'referral' AND owner_customer_id IS NOT NULL;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS credit_applied NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_credit_awarded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS credit_spent BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS customer_credit_ledger (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  amount NUMERIC(10,2) NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('referral_reward', 'booking_redemption', 'admin_adjustment')),
  source_booking_id TEXT REFERENCES bookings(id),
  source_promo_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_credit_ledger_customer
  ON customer_credit_ledger(customer_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_ledger_booking_source
  ON customer_credit_ledger(source_booking_id, source_type)
  WHERE source_booking_id IS NOT NULL;

CREATE OR REPLACE FUNCTION redeem_booking_promo(p_booking_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booking_row bookings%ROWTYPE;
  promo_row promo_codes%ROWTYPE;
  reward_amount NUMERIC(10,2);
  ledger_id TEXT;
BEGIN
  SELECT *
    INTO booking_row
    FROM bookings
   WHERE id = p_booking_id
     AND status = 'confirmed'
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF booking_row.promo_code IS NOT NULL AND booking_row.promo_redemption_counted = false THEN
    UPDATE promo_codes
       SET used_count = COALESCE(used_count, 0) + 1
     WHERE code = booking_row.promo_code;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Promo code % not found for booking %',
        booking_row.promo_code, p_booking_id;
    END IF;

    UPDATE bookings
       SET promo_redemption_counted = true
     WHERE id = p_booking_id;

    SELECT *
      INTO promo_row
      FROM promo_codes
     WHERE code = booking_row.promo_code;

    reward_amount := COALESCE(booking_row.discount_amount, 0);

    IF promo_row.promo_type = 'referral'
       AND promo_row.owner_customer_id IS NOT NULL
       AND booking_row.referral_credit_awarded = false
       AND reward_amount > 0 THEN
      ledger_id := 'ccl_' || replace(gen_random_uuid()::text, '-', '');
      INSERT INTO customer_credit_ledger (
        id,
        customer_id,
        amount,
        source_type,
        source_booking_id,
        source_promo_code
      )
      VALUES (
        ledger_id,
        promo_row.owner_customer_id,
        reward_amount,
        'referral_reward',
        p_booking_id,
        booking_row.promo_code
      )
      ON CONFLICT DO NOTHING;

      UPDATE bookings
         SET referral_credit_awarded = true
       WHERE id = p_booking_id
         AND referral_credit_awarded = false;
    END IF;
  END IF;

  IF COALESCE(booking_row.credit_applied, 0) > 0
     AND booking_row.credit_spent = false
     AND booking_row.customer_id IS NOT NULL THEN
    ledger_id := 'ccl_' || replace(gen_random_uuid()::text, '-', '');
    INSERT INTO customer_credit_ledger (
      id,
      customer_id,
      amount,
      source_type,
      source_booking_id
    )
    VALUES (
      ledger_id,
      booking_row.customer_id,
      -booking_row.credit_applied,
      'booking_redemption',
      p_booking_id
    )
    ON CONFLICT DO NOTHING;

    UPDATE bookings
       SET credit_spent = true
     WHERE id = p_booking_id
       AND credit_spent = false;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION redeem_booking_promo(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION redeem_booking_promo(TEXT) TO service_role;
