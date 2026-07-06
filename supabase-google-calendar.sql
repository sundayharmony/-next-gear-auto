-- Google Calendar fleet sync (one-way NGA → GCal)
-- Run in Supabase SQL editor before enabling the integration.

CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id TEXT NOT NULL,
  calendar_summary TEXT,
  refresh_token_enc TEXT NOT NULL,
  connected_by_admin_id TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS google_calendar_event_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_kind TEXT NOT NULL CHECK (source_kind IN ('booking', 'turo', 'blocked')),
  source_id TEXT NOT NULL,
  google_event_id TEXT NOT NULL,
  google_calendar_id TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_kind, source_id)
);

CREATE INDEX IF NOT EXISTS idx_gcal_event_links_calendar
  ON google_calendar_event_links (google_calendar_id);

CREATE INDEX IF NOT EXISTS idx_gcal_event_links_source
  ON google_calendar_event_links (source_kind, source_id);
