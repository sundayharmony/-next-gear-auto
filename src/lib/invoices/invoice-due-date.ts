/** Default payment due date: 7 calendar days from today (local). */
export function defaultInvoiceDueDate(from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + 7);
  return formatIsoDate(d);
}

export function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Display "2026-05-28" → "Wed, May 28, 2026" (matches invoice email style). */
export function formatInvoiceDisplayDate(dateStr: string): string {
  const date = parseIsoDate(dateStr);
  if (!date) return dateStr;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function parseIsoDate(iso: string): Date | null {
  const parts = iso.trim().split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, m, d] = parts;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

export function validateInvoiceDueDate(
  raw: unknown,
  invoiceDateIso: string,
): { ok: true; dueDate: string } | { ok: false; message: string } {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, message: "Payment due date is required" };
  }
  const dueDate = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return { ok: false, message: "Due date must be YYYY-MM-DD" };
  }
  const due = parseIsoDate(dueDate);
  const invoice = parseIsoDate(invoiceDateIso);
  if (!due) {
    return { ok: false, message: "Invalid due date" };
  }
  if (!invoice) {
    return { ok: true, dueDate };
  }
  if (due.getTime() < invoice.getTime()) {
    return { ok: false, message: "Due date cannot be before the invoice date" };
  }
  return { ok: true, dueDate };
}
