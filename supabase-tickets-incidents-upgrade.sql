-- Tickets: Turo trip link + structured line items
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS blocked_date_id TEXT REFERENCES blocked_dates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS line_items JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_tickets_blocked_date ON tickets(blocked_date_id);

-- Incident reports (fleet damage, accidents, customer issues)
CREATE TABLE IF NOT EXISTS incident_reports (
  id TEXT PRIMARY KEY,
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  blocked_date_id TEXT REFERENCES blocked_dates(id) ON DELETE SET NULL,
  vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  occurred_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'closed')),
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on incident_reports" ON incident_reports;
CREATE POLICY "Service role full access on incident_reports"
  ON incident_reports FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_incident_reports_booking ON incident_reports(booking_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_blocked_date ON incident_reports(blocked_date_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_vehicle ON incident_reports(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_status ON incident_reports(status);
