-- Long-lived Google Calendar OAuth (run once on existing installs)
ALTER TABLE google_calendar_connections
  ADD COLUMN IF NOT EXISTS last_token_refresh_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS needs_reauth BOOLEAN NOT NULL DEFAULT false;
