"use client";

import React, { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail, Plus, Trash2 } from "lucide-react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { MAX_ADDITIONAL_INVOICE_LINES } from "@/lib/invoices/invoice-line-items";
import {
  emptyDraft,
  parseDraftLines,
  type DraftLine,
  type InvoiceDetail,
} from "./invoice-types";

type InvoiceSendModuleProps = {
  detail: InvoiceDetail;
  drafts: DraftLine[];
  setDrafts: React.Dispatch<React.SetStateAction<DraftLine[]>>;
  dueDate: string;
  setDueDate: (value: string) => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onRefreshList: () => void;
  onReloadDetail: (invoiceId: string) => void;
  onDeleted: () => void;
};

export function InvoiceSendModule({
  detail,
  drafts,
  setDrafts,
  dueDate,
  setDueDate,
  onSuccess,
  onError,
  onRefreshList,
  onReloadDetail,
  onDeleted,
}: InvoiceSendModuleProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const addLine = useCallback(() => {
    setDrafts((prev) => {
      if (prev.length >= MAX_ADDITIONAL_INVOICE_LINES) return prev;
      return [...prev, emptyDraft()];
    });
  }, [setDrafts]);

  const removeLine = useCallback(
    (id: string) => {
      setDrafts((prev) => (prev.length <= 1 ? [emptyDraft()] : prev.filter((d) => d.id !== id)));
    },
    [setDrafts],
  );

  const updateLine = useCallback(
    (id: string, patch: Partial<DraftLine>) => {
      setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    },
    [setDrafts],
  );

  const handleSaveAndResend = async () => {
    if (saving) return;
    const additionalItems = parseDraftLines(drafts);
    const invalid = drafts.some((d) => {
      const hasLabel = d.label.trim().length > 0;
      const hasAmount = d.amount.trim().length > 0;
      return (hasLabel && !hasAmount) || (!hasLabel && hasAmount);
    });
    if (invalid) {
      onError("Each line needs both description and amount, or leave the row empty.");
      return;
    }
    if (!dueDate) {
      onError("Please select a due date.");
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
        onError(patchData.message || "Failed to save invoice");
        return;
      }

      const sendRes = await adminFetch(`/api/admin/invoices/${detail.id}/send`, {
        method: "POST",
      });
      const sendData = await sendRes.json();
      if (sendRes.ok && sendData.success) {
        onSuccess(sendData.message || "Invoice saved and sent");
        onRefreshList();
        onReloadDetail(detail.id);
      } else {
        onError(sendData.message || "Saved but failed to send email");
      }
    } catch {
      onError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    const label = detail.customer_name || detail.booking_id;
    if (
      !window.confirm(
        `Delete invoice for ${label}? This removes the invoice record only — the booking is not changed. You can send a new invoice from the booking later.`,
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const res = await adminFetch(`/api/admin/invoices/${detail.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess(data.message || "Invoice deleted");
        onDeleted();
        const params = new URLSearchParams(searchParams.toString());
        params.delete("invoice");
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname);
        onRefreshList();
      } else {
        onError(data.message || "Failed to delete invoice");
      }
    } catch {
      onError("Network error — could not delete invoice");
    } finally {
      setDeleting(false);
    }
  };

  return (
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

      <Button className="w-full" onClick={handleSaveAndResend} disabled={saving || deleting}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
        Save &amp; re-send
      </Button>

      <Button
        type="button"
        variant="danger"
        className="w-full"
        onClick={handleDelete}
        disabled={saving || deleting}
      >
        {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
        Delete invoice
      </Button>
    </>
  );
}
