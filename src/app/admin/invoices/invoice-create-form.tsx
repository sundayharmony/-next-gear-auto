"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { AdminCard } from "@/components/admin/admin-shell";
import { DocumentLineItemsEditor } from "@/components/admin/document-line-items-editor";
import { defaultInvoiceDueDate } from "@/lib/invoices/invoice-due-date";
import { emptyDraft, parseDraftLines, type DraftLine } from "./invoice-types";

type BookingOption = {
  id: string;
  customer_name?: string | null;
  customer_email?: string | null;
  pickup_date?: string | null;
  return_date?: string | null;
};

export function InvoiceCreateForm({
  onCancel,
  onCreated,
  onError,
}: {
  onCancel: () => void;
  onCreated: (invoiceId: string, existed: boolean) => void;
  onError: (message: string) => void;
}) {
  const [bookings, setBookings] = useState<BookingOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [dueDate, setDueDate] = useState(defaultInvoiceDueDate());
  const [drafts, setDrafts] = useState<DraftLine[]>([emptyDraft()]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFetch("/api/admin/bookings");
        const json = await res.json();
        if (!cancelled && res.ok) setBookings(json.data || []);
        else if (!cancelled) onError(json.message || "Could not load bookings");
      } catch {
        if (!cancelled) onError("Could not load bookings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onError]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q
      ? bookings.filter((b) =>
          `${b.customer_name || ""} ${b.customer_email || ""} ${b.id}`.toLowerCase().includes(q),
        )
      : bookings;
    return rows.slice(0, 40);
  }, [bookings, query]);

  const create = async () => {
    if (!bookingId) {
      onError("Select a booking to invoice");
      return;
    }
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          dueDate,
          additionalLineItems: parseDraftLines(drafts),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        onError(json.message || "Could not create invoice");
        return;
      }
      onCreated(json.data.id as string, Boolean(json.existed));
    } catch {
      onError("Could not create invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminCard className="space-y-4 max-w-5xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">New invoice</h2>
        <p className="text-sm text-gray-500 mt-1">
          Each booking has one invoice. Creating one for a booking that already has an invoice opens that invoice so you can edit and send it.
        </p>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase text-gray-500 block mb-1">Find booking</label>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customer, email, or booking id"
        />
      </div>
      {loading ? (
        <p className="text-sm text-gray-500">Loading bookings…</p>
      ) : (
        <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-lg divide-y">
          {filtered.length === 0 ? (
            <p className="p-3 text-sm text-gray-500">No bookings match.</p>
          ) : (
            filtered.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBookingId(b.id)}
                className={`w-full text-left px-3 py-2 text-sm ${
                  bookingId === b.id ? "bg-purple-50" : "hover:bg-gray-50"
                }`}
              >
                <span className="font-medium text-gray-900">{b.customer_name || "Customer"}</span>
                <span className="text-gray-500"> · {b.pickup_date || "—"} → {b.return_date || "—"}</span>
                <span className="block text-xs text-gray-400 font-mono">{b.id}</span>
              </button>
            ))
          )}
        </div>
      )}
      <div className="max-w-xs">
        <label className="text-xs font-semibold uppercase text-gray-500 block mb-1">Due date</label>
        <DatePicker value={dueDate} onChange={setDueDate} />
      </div>
      <DocumentLineItemsEditor drafts={drafts} onChange={setDrafts} showCreditToggle />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void create()} disabled={saving || !bookingId}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Create invoice
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </AdminCard>
  );
}
