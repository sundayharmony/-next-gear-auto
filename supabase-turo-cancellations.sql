-- ============================================================
-- Turo trip cancellations: track cancelled Turo trips separately
-- from active calendar blocks. Run in the Supabase SQL Editor.
-- ============================================================

ALTER TABLE blocked_dates
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_blocked_dates_turo_active
  ON blocked_dates (vehicle_id, start_date, end_date)
  WHERE source = 'turo-email' AND cancelled_at IS NULL;
