-- ═══════════════════════════════════════════════════════════════
-- Tickets table for tracking traffic & parking violations
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id TEXT,
  vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  license_plate TEXT,
  ticket_type TEXT DEFAULT 'traffic' CHECK (ticket_type IN ('traffic', 'parking')),
  violation_date TEXT NOT NULL,
  state TEXT,
  municipality TEXT,
  court_id TEXT,
  prefix TEXT,
  ticket_number TEXT,
  amount_due DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'disputed', 'dismissed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access on tickets"
  ON tickets FOR ALL USING (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_tickets_booking ON tickets(booking_id);
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_vehicle ON tickets(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
