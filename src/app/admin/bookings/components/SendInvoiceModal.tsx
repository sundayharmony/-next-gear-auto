"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Mail, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminFetch } from "@/lib/utils/admin-fetch";
import type { InvoiceLineItem } from "@/lib/invoices/invoice-data";
import {
  MAX_ADDITIONAL_INVOICE_LINES,
  sumInvoiceLineItems,
  type AdditionalInvoiceLineItemInput,
} from "@/lib/invoices/invoice-line-items";

type TabId = "edit" | "preview";

type DraftLine = {
  id: string;
  label: string;
  amount: string;
  isCredit: boolean;
};

type PreviewData = {
  lineItems: InvoiceLineItem[];
  chargesTotal: number;
  amountPaid: number;
  balanceDue: number;
  customerEmail: string;
  customerName: string;
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

function fmt(n: number): string {
  return `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

interface SendInvoiceModalProps {
  bookingId: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function SendInvoiceModal({
  bookingId,
  onClose,
  onSuccess,
  onError,
}: SendInvoiceModalProps) {
  const [tab, setTab] = useState<TabId>("edit");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState("");
  const [drafts, setDrafts] = useState<DraftLine[]>([emptyDraft()]);
  const [sending, setSending] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState("");
  const [loadingHtml, setLoadingHtml] = useState(false);
  const [htmlError, setHtmlError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoadingPreview(true);
    setPreviewError("");

    adminFetch(`/api/admin/bookings/invoice-preview?bookingId=${encodeURIComponent(bookingId)}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.success) {
          setPreviewError(data.message || "Could not load invoice preview");
          return;
        }
        setPreview(data.data as PreviewData);
      })
      .catch(() => {
        if (!cancelled) setPreviewError("Network error — could not load invoice preview");
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const additionalItems = useMemo(() => parseDraftLines(drafts), [drafts]);

  const totals = useMemo(() => {
    if (!preview) return null;
    const baseCharges = preview.chargesTotal;
    const extra = additionalItems.length > 0 ? sumInvoiceLineItems(additionalItems) : 0;
    const chargesTotal = Math.max(0, Math.round((baseCharges + extra) * 100) / 100);
    const balanceDue =
      additionalItems.length > 0
        ? Math.max(0, Math.round((chargesTotal - preview.amountPaid) * 100) / 100)
        : preview.balanceDue;
    return { chargesTotal, balanceDue, extra };
  }, [preview, additionalItems]);

  useEffect(() => {
    if (tab !== "preview" || !preview || loadingPreview || previewError) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      setLoadingHtml(true);
      setHtmlError("");

      adminFetch("/api/admin/bookings/invoice-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          additionalLineItems: additionalItems,
        }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (cancelled) return;
          if (!res.ok || !data.success) {
            setHtmlPreview("");
            setHtmlError(data.message || "Could not render invoice preview");
            return;
          }
          setHtmlPreview(typeof data.data?.html === "string" ? data.data.html : "");
        })
        .catch(() => {
          if (!cancelled) {
            setHtmlPreview("");
            setHtmlError("Network error — could not render invoice preview");
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
  }, [tab, preview, loadingPreview, previewError, bookingId, additionalItems]);

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

  const handleSend = useCallback(async () => {
    if (!preview || sending) return;

    const invalid = drafts.some((d) => {
      const hasLabel = d.label.trim().length > 0;
      const hasAmount = d.amount.trim().length > 0;
      return (hasLabel && !hasAmount) || (!hasLabel && hasAmount);
    });
    if (invalid) {
      onError("Each additional line needs both a description and an amount, or leave the row empty.");
      return;
    }

    setSending(true);
    try {
      const res = await adminFetch("/api/admin/bookings/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          additionalLineItems: additionalItems,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess(data.message || `Invoice sent to ${preview.customerEmail}`);
        onClose();
      } else {
        onError(data.message || "Failed to send invoice");
      }
    } catch {
      onError("Network error — could not send invoice");
    } finally {
      setSending(false);
    }
  }, [preview, sending, drafts, additionalItems, bookingId, onClose, onSuccess, onError]);

  const tabBtn = (id: TabId, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        tab === id
          ? "bg-purple-600 text-white shadow-sm"
          : "text-gray-600 hover:bg-purple-50 hover:text-purple-800"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !sending) onClose();
      }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-invoice-title"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <h2 id="send-invoice-title" className="font-semibold text-gray-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple-600" />
            Send Invoice
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="p-1 rounded hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 pt-3 shrink-0" role="tablist" aria-label="Invoice modal sections">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            {tabBtn("edit", "Edit")}
            {tabBtn("preview", "Preview")}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loadingPreview && (
            <p className="text-sm text-gray-500 py-6 text-center">Loading invoice preview…</p>
          )}
          {previewError && (
            <p className="text-sm text-red-600 py-4">{previewError}</p>
          )}
          {preview && !loadingPreview && tab === "edit" && (
            <>
              <div className="text-sm text-gray-600">
                <p>
                  To: <span className="font-medium text-gray-900">{preview.customerEmail}</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{preview.customerName}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  Booking charges
                </p>
                <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100 text-sm">
                  {preview.lineItems.map((item, i) => (
                    <li key={i} className="flex justify-between gap-3 px-3 py-2">
                      <span className="text-gray-700">{item.label}</span>
                      <span className={item.isCredit ? "text-green-700 shrink-0" : "text-gray-900 shrink-0"}>
                        {item.isCredit ? "−" : ""}
                        {fmt(item.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Additional line items
                  </p>
                  <button
                    type="button"
                    onClick={addLine}
                    disabled={drafts.length >= MAX_ADDITIONAL_INVOICE_LINES}
                    className="text-xs text-purple-700 hover:text-purple-900 font-medium flex items-center gap-1 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add line
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  Optional charges or credits added to this invoice only (booking record is not changed).
                </p>
                <div className="space-y-2">
                  {drafts.map((row) => (
                    <div key={row.id} className="flex gap-2 items-start">
                      <Input
                        value={row.label}
                        onChange={(e) => updateLine(row.id, { label: e.target.value })}
                        placeholder="Description (e.g. Late fee)"
                        className="flex-1 text-sm"
                      />
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.amount}
                        onChange={(e) => updateLine(row.id, { amount: e.target.value })}
                        placeholder="0.00"
                        className="w-24 text-sm"
                      />
                      <label className="flex items-center gap-1 text-xs text-gray-600 shrink-0 pt-2">
                        <input
                          type="checkbox"
                          checked={row.isCredit}
                          onChange={(e) => updateLine(row.id, { isCredit: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        Credit
                      </label>
                      <button
                        type="button"
                        onClick={() => removeLine(row.id)}
                        className="p-2 text-gray-400 hover:text-red-600 shrink-0"
                        aria-label="Remove line"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {totals && (
                <div className="rounded-lg bg-purple-50 border border-purple-100 px-3 py-2.5 text-sm space-y-1">
                  <div className="flex justify-between text-gray-700">
                    <span>Charges total</span>
                    <span className="font-medium">{fmt(totals.chargesTotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Payments received</span>
                    <span>−{fmt(preview.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-purple-900 pt-1 border-t border-purple-200">
                    <span>Balance due on invoice</span>
                    <span>{fmt(totals.balanceDue)}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {preview && !loadingPreview && tab === "preview" && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                Email preview (includes additional line items). PDF attachment is not shown here.
              </p>
              {loadingHtml && (
                <p className="text-sm text-gray-500 py-8 text-center">Rendering preview…</p>
              )}
              {htmlError && !loadingHtml && (
                <p className="text-sm text-red-600 py-4">{htmlError}</p>
              )}
              {!loadingHtml && !htmlError && htmlPreview && (
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  <iframe
                    title="Invoice email preview"
                    srcDoc={htmlPreview}
                    sandbox=""
                    className="w-full h-[400px] max-h-[400px] bg-white"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-gray-200 shrink-0">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 bg-purple-600 hover:bg-purple-700"
            onClick={handleSend}
            disabled={sending || loadingPreview || !preview || !!previewError}
          >
            {sending ? "Sending…" : "Send invoice"}
          </Button>
        </div>
      </div>
    </div>
  );
}
