"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  Mail,
  Plus,
  Trash2,
  X,
  Loader2,
  RefreshCw,
  ExternalLink,
  Search,
} from "lucide-react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { useAutoToast } from "@/lib/hooks/useAutoToast";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Select } from "@/components/ui/select";
import {
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  type InvoicePaymentStatus,
} from "@/lib/invoices/invoice-status";
import {
  MAX_ADDITIONAL_INVOICE_LINES,
  type AdditionalInvoiceLineItemInput,
} from "@/lib/invoices/invoice-line-items";
import { formatDate } from "@/lib/utils/date-helpers";

type DraftLine = {
  id: string;
  label: string;
  amount: string;
  isCredit: boolean;
};

type InvoiceListRow = {
  id: string;
  booking_id: string;
  customer_name: string | null;
  customer_email: string | null;
  charges_total: number;
  balance_due_snapshot: number;
  due_date: string;
  sent_at: string | null;
  send_count: number;
  vehicleName: string;
  liveBalance: number;
  paymentStatus: InvoicePaymentStatus;
};

type SendHistoryRow = {
  id: string;
  created_at: string;
  performed_by: string | null;
  details: Record<string, unknown>;
};

type InvoiceDetail = InvoiceListRow & {
  additional_line_items: AdditionalInvoiceLineItemInput[];
  line_items: { label: string; amount: number; isCredit?: boolean }[];
  amount_paid_snapshot: number;
  sendHistory: SendHistoryRow[];
};

function emptyDraft(): DraftLine {
  return { id: crypto.randomUUID(), label: "", amount: "", isCredit: false };
}

function parseDraftLines(drafts: DraftLine[]): AdditionalInvoiceLineItemInput[] {
  return drafts
    .map((d) => ({
      label: d.label.trim(),
      amount: Number.parseFloat(d.amount),
      isCredit: d.isCredit || undefined,
    }))
    .filter((d) => d.label && Number.isFinite(d.amount) && d.amount >= 0);
}

function draftsFromAdditional(items: AdditionalInvoiceLineItemInput[]): DraftLine[] {
  if (!items.length) return [emptyDraft()];
  return items.map((item) => ({
    id: crypto.randomUUID(),
    label: item.label,
    amount: String(item.amount),
    isCredit: !!item.isCredit,
  }));
}

function fmt(n: number): string {
  return `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

interface InvoicesPageClientProps {
  bookingsHref: string;
  isAdmin?: boolean;
}

export function InvoicesPageClient({ bookingsHref, isAdmin = false }: InvoicesPageClientProps) {
  const searchParams = useSearchParams();
  const { error, setError, success, setSuccess } = useAutoToast();
  const [invoices, setInvoices] = useState<InvoiceListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | InvoicePaymentStatus>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [drafts, setDrafts] = useState<DraftLine[]>([emptyDraft()]);
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [detailTab, setDetailTab] = useState<"edit" | "preview">("edit");
  const [htmlPreview, setHtmlPreview] = useState("");
  const [loadingHtml, setLoadingHtml] = useState(false);
  const [htmlError, setHtmlError] = useState("");

  const additionalItems = useMemo(() => parseDraftLines(drafts), [drafts]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("q", search.trim());
      const res = await adminFetch(`/api/admin/invoices?${params}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setInvoices(data.data ?? []);
      } else {
        setError(data.message || "Failed to load invoices");
      }
    } catch {
      setError("Network error — could not load invoices");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, setError]);

  useEffect(() => {
    const t = setTimeout(() => loadList(), 200);
    return () => clearTimeout(t);
  }, [loadList]);

  useEffect(() => {
    const inv = searchParams.get("invoice");
    if (inv) setSelectedId(inv);
  }, [searchParams]);

  const loadDetail = useCallback(async (invoiceId: string) => {
    setDetailLoading(true);
    try {
      const res = await adminFetch(`/api/admin/invoices/${invoiceId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        const d = data.data as InvoiceDetail;
        setDetail(d);
        setDueDate(d.due_date);
        setDrafts(draftsFromAdditional(d.additional_line_items ?? []));
      } else {
        setError(data.message || "Failed to load invoice");
      }
    } catch {
      setError("Network error — could not load invoice");
    } finally {
      setDetailLoading(false);
    }
  }, [setError]);

  useEffect(() => {
    if (selectedId) {
      setDetailTab("edit");
      loadDetail(selectedId);
    } else {
      setDetail(null);
    }
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (detailTab !== "preview" || !detail) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      setLoadingHtml(true);
      setHtmlError("");

      adminFetch("/api/admin/bookings/invoice-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: detail.booking_id,
          additionalLineItems: additionalItems,
          dueDate,
        }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (cancelled) return;
          if (res.ok && data.success) {
            setHtmlPreview(typeof data.data?.html === "string" ? data.data.html : "");
          } else {
            setHtmlPreview("");
            setHtmlError(data.message || "Could not render preview");
          }
        })
        .catch(() => {
          if (!cancelled) {
            setHtmlPreview("");
            setHtmlError("Network error — could not render preview");
          }
        })
        .finally(() => {
          if (!cancelled) setLoadingHtml(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [detailTab, detail, additionalItems, dueDate]);

  const handleBackfill = async () => {
    setBackfilling(true);
    try {
      const res = await adminFetch("/api/admin/invoices?backfill=1");
      const data = await res.json();
      if (res.ok && data.success) {
        const r = data.data;
        setSuccess(`Backfill complete: ${r.created} created, ${r.updated} updated, ${r.skipped} skipped`);
        loadList();
      } else {
        setError(data.message || "Backfill failed");
      }
    } catch {
      setError("Backfill failed");
    } finally {
      setBackfilling(false);
    }
  };

  const handleSaveAndResend = async () => {
    if (!detail || saving) return;
    const additionalItems = parseDraftLines(drafts);
    const invalid = drafts.some((d) => {
      const hasLabel = d.label.trim().length > 0;
      const hasAmount = d.amount.trim().length > 0;
      return (hasLabel && !hasAmount) || (!hasLabel && hasAmount);
    });
    if (invalid) {
      setError("Each line needs both description and amount, or leave the row empty.");
      return;
    }
    if (!dueDate) {
      setError("Please select a due date.");
      return;
    }

    setSaving(true);
    try {
      const patchRes = await adminFetch(`/api/admin/invoices/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          additionalLineItems: additionalItems,
          dueDate,
        }),
      });
      const patchData = await patchRes.json();
      if (!patchRes.ok || !patchData.success) {
        setError(patchData.message || "Failed to save invoice");
        return;
      }

      const sendRes = await adminFetch(`/api/admin/invoices/${detail.id}/send`, {
        method: "POST",
      });
      const sendData = await sendRes.json();
      if (sendRes.ok && sendData.success) {
        setSuccess(sendData.message || "Invoice saved and sent");
        loadList();
        loadDetail(detail.id);
      } else {
        setError(sendData.message || "Saved but failed to send email");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => invoices, [invoices]);

  const addLine = () => {
    if (drafts.length >= MAX_ADDITIONAL_INVOICE_LINES) return;
    setDrafts((prev) => [...prev, emptyDraft()]);
  };

  const removeLine = (id: string) => {
    setDrafts((prev) => (prev.length <= 1 ? [emptyDraft()] : prev.filter((d) => d.id !== id)));
  };

  const updateLine = (id: string, patch: Partial<DraftLine>) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-7 w-7 text-purple-600" />
            Invoices
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            View sent invoices, edit line items, and track payment status from live booking balances.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadList} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={handleBackfill} disabled={backfilling}>
              {backfilling ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Import from history
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">{success}</div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search customer, email, booking ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="sm:w-40"
            >
              <option value="all">All statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="overdue">Overdue</option>
              <option value="paid">Paid</option>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <p className="p-8 text-center text-sm text-gray-500">Loading invoices…</p>
              ) : filtered.length === 0 ? (
                <p className="p-8 text-center text-sm text-gray-500">
                  No invoices yet. Send one from a booking, or use Import from history (admin).
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left text-xs text-gray-500 uppercase">
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Vehicle</th>
                        <th className="px-4 py-3">Sent</th>
                        <th className="px-4 py-3">Due</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-right">Balance</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((inv) => (
                        <tr
                          key={inv.id}
                          className={`border-b cursor-pointer hover:bg-purple-50/50 ${
                            selectedId === inv.id ? "bg-purple-50" : ""
                          }`}
                          onClick={() => setSelectedId(inv.id)}
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{inv.customer_name || "—"}</div>
                            <div className="text-xs text-gray-500">{inv.customer_email}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{inv.vehicleName}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {inv.sent_at ? formatDate(inv.sent_at) : "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(inv.due_date)}</td>
                          <td className="px-4 py-3 text-right">{fmt(inv.charges_total)}</td>
                          <td className="px-4 py-3 text-right font-medium">{fmt(inv.liveBalance)}</td>
                          <td className="px-4 py-3">
                            <Badge className={INVOICE_STATUS_COLORS[inv.paymentStatus]}>
                              {INVOICE_STATUS_LABELS[inv.paymentStatus]}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {selectedId && (
          <div className="w-full lg:w-[420px] shrink-0">
            <Card className="sticky top-4">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">Invoice detail</h2>
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="p-1 rounded hover:bg-gray-100"
                    aria-label="Close detail"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                {detailLoading || !detail ? (
                  <p className="text-sm text-gray-500 py-6 text-center">Loading…</p>
                ) : (
                  <>
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="text-gray-500">Booking:</span>{" "}
                        <Link
                          href={`${bookingsHref}?highlight=${detail.booking_id}`}
                          className="text-purple-600 hover:underline font-mono text-xs"
                        >
                          {detail.booking_id}
                        </Link>
                      </p>
                      <p>
                        <span className="text-gray-500">Sends:</span> {detail.send_count}
                      </p>
                      <Badge className={INVOICE_STATUS_COLORS[detail.paymentStatus]}>
                        {INVOICE_STATUS_LABELS[detail.paymentStatus]} — balance {fmt(detail.liveBalance)}
                      </Badge>
                    </div>

                    <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setDetailTab("edit")}
                        className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md ${
                          detailTab === "edit"
                            ? "bg-purple-600 text-white"
                            : "text-gray-600 hover:bg-purple-50"
                        }`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailTab("preview")}
                        className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md ${
                          detailTab === "preview"
                            ? "bg-purple-600 text-white"
                            : "text-gray-600 hover:bg-purple-50"
                        }`}
                      >
                        Preview
                      </button>
                    </div>

                    {detailTab === "preview" ? (
                      <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto bg-white">
                        {loadingHtml && (
                          <p className="p-4 text-sm text-gray-500 text-center">Rendering preview…</p>
                        )}
                        {htmlError && (
                          <p className="p-4 text-sm text-red-600">{htmlError}</p>
                        )}
                        {!loadingHtml && !htmlError && htmlPreview && (
                          <div
                            className="p-2 text-sm"
                            dangerouslySetInnerHTML={{ __html: htmlPreview }}
                          />
                        )}
                      </div>
                    ) : (
                      <>
                    <div>
                      <label className="text-xs font-medium text-gray-700">Due date</label>
                      <DatePicker value={dueDate} onChange={setDueDate} className="mt-1" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-700">Additional line items</span>
                        <Button type="button" variant="outline" size="sm" onClick={addLine}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {drafts.map((d) => (
                          <div key={d.id} className="flex gap-2 items-start">
                            <Input
                              placeholder="Description"
                              value={d.label}
                              onChange={(e) => updateLine(d.id, { label: e.target.value })}
                              className="flex-1 text-sm"
                            />
                            <Input
                              placeholder="0.00"
                              type="number"
                              min={0}
                              step="0.01"
                              value={d.amount}
                              onChange={(e) => updateLine(d.id, { amount: e.target.value })}
                              className="w-24 text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => removeLine(d.id)}
                              className="p-2 text-gray-400 hover:text-red-600"
                              aria-label="Remove line"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleSaveAndResend}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Mail className="h-4 w-4 mr-2" />
                      )}
                      Save &amp; re-send
                    </Button>
                      </>
                    )}

                    <Link
                      href={`${bookingsHref}?highlight=${detail.booking_id}`}
                      className="flex items-center justify-center gap-1 text-sm text-purple-600 hover:underline"
                    >
                      Open booking
                      <ExternalLink className="h-3 w-3" />
                    </Link>

                    {detail.sendHistory.length > 0 && (
                      <div className="pt-3 border-t">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Send history</p>
                        <ul className="space-y-2 max-h-32 overflow-y-auto text-xs text-gray-600">
                          {detail.sendHistory.map((h) => (
                            <li key={h.id}>
                              {formatDate(h.created_at)} — {h.performed_by || "Staff"}
                              {typeof h.details?.balance_due === "number" && (
                                <span> ({fmt(h.details.balance_due as number)} due)</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
