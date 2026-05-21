/** Postgres undefined_table */
export function invoiceTableMissingMessage(error: {
  code?: string;
  message?: string;
} | null): string | null {
  if (!error) return null;
  if (error.code === "42P01" || error.code === "PGRST205") {
    return "Invoices table not found. Run _archive/sql-migrations/supabase-invoices-table.sql in Supabase.";
  }
  const msg = (error.message || "").toLowerCase();
  if (msg.includes("invoices") && (msg.includes("does not exist") || msg.includes("schema cache") || msg.includes("could not find"))) {
    return "Invoices database table is missing. Run the invoices migration in Supabase.";
  }
  return null;
}
