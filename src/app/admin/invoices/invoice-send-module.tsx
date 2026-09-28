"use client";

import React, { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail, Trash2 } from "lucide-react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { DocumentLineItemsEditor } from "@/components/admin/document-line-items-editor";
import { parseDraftLines, type DraftLine, type InvoiceDetail } from "./invoice-types";

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

  const handleSaveAndResend = async () => {
    if (saving) return;
    const additionalItems = parseDraftLines(drafts);
    const invalid = drafts.some((d) => {
      const hasTitle = d.title.trim().length > 0;
      const hasPrice = String(d.unitPrice).trim().length > 0;
      return (hasTitle && !hasPrice) || (!hasTitle && hasPrice);
    });
    if (invalid) {
      onError("Each line needs a title and price, or leave the row empty.");
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

      <DocumentLineItemsEditor drafts={drafts} onChange={setDrafts} showCreditToggle />

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
