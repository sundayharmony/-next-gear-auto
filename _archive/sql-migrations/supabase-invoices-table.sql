-- Invoices: one active invoice per booking (editable, re-sendable)
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_email TEXT,
  additional_line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  charges_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  amount_paid_snapshot NUMERIC(10, 2) NOT NULL DEFAULT 0,
  balance_due_snapshot NUMERIC(10, 2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sent_by TEXT,
  send_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sent_at ON invoices(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; anon policies not required for admin-only table
CREATE POLICY "Service role full access on invoices"
  ON invoices
  FOR ALL
  USING (true)
  WITH CHECK (true);
