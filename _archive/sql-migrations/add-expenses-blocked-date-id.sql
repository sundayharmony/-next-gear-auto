-- Link manual expenses to a Turo trip (blocked_dates row, source = turo-email).
-- Run in Supabase SQL editor (or your migration runner).

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS blocked_date_id TEXT REFERENCES blocked_dates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_blocked_date_id ON expenses(blocked_date_id)
  WHERE blocked_date_id IS NOT NULL;
