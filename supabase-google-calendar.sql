-- Google Calendar Integration
-- Stores OAuth tokens for customers who connect their Google Calendar

CREATE TABLE IF NOT EXISTS customer_google_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expiry_date BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by customer
CREATE INDEX IF NOT EXISTS idx_customer_google_tokens_customer_id 
  ON customer_google_tokens(customer_id);

-- Store Google Calendar event IDs linked to bookings
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT;

-- RLS policies
ALTER TABLE customer_google_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can access tokens (server-side only)
CREATE POLICY "Service role can manage google tokens"
  ON customer_google_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE customer_google_tokens IS 'Stores Google OAuth tokens for Calendar integration';
COMMENT ON COLUMN customer_google_tokens.access_token IS 'Short-lived access token for Google API calls';
COMMENT ON COLUMN customer_google_tokens.refresh_token IS 'Long-lived refresh token for obtaining new access tokens';
COMMENT ON COLUMN customer_google_tokens.expiry_date IS 'Unix timestamp (ms) when access_token expires';
COMMENT ON COLUMN bookings.google_calendar_event_id IS 'Google Calendar event ID for automatic sync';
