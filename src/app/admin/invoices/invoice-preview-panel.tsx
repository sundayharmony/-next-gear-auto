"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
} from "@/lib/invoices/invoice-status";
import { formatDate } from "@/lib/utils/date-helpers";
import { InvoiceSendModule } from "./invoice-send-module";
import {
  draftsFromAdditional,
  emptyDraft,
  fmt,
  parseDraftLines,
  type DraftLine,
  type InvoiceDetail,
} from "./invoice-types";

type InvoicePreviewPanelProps = {
  detailLoading: boolean;
  detail: InvoiceDetail | null;
  bookingsHref: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onRefreshList: () => void;
  onReloadDetail: (invoiceId: string) => void;
  onDeleted: () => void;
};

function InvoiceHtmlPreview({
  detail,
  additionalItems,
  dueDate,
}: {
  detail: InvoiceDetail;
  additionalItems: ReturnType<typeof parseDraftLines>;
  dueDate: string;
}) {
  const [htmlPreview, setHtmlPreview] = useState("");
  const [loadingHtml, setLoadingHtml] = useState(false);
  const [htmlError, setHtmlError] = useState("");

  useEffect(() => {
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
  }, [detail, additionalItems, dueDate]);

  return (
    <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto bg-white">
      {loadingHtml && <p className="p-4 text-sm text-gray-500 text-center">Rendering preview…</p>}
      {htmlError && <p className="p-4 text-sm text-red-600">{htmlError}</p>}
      {!loadingHtml && !htmlError && htmlPreview && (
        <div className="p-2 text-sm" dangerouslySetInnerHTML={{ __html: htmlPreview }} />
      )}
    </div>
  );
}

export function InvoicePreviewPanel({
  detailLoading,
  detail,
  bookingsHref,
  onClose,
  onSuccess,
  onError,
  onRefreshList,
  onReloadDetail,
  onDeleted,
}: InvoicePreviewPanelProps) {
  const [detailTab, setDetailTab] = useState<"edit" | "preview">("edit");
  const [drafts, setDrafts] = useState<DraftLine[]>([emptyDraft()]);
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (detail) {
      setDetailTab("edit");
      setDueDate(detail.due_date);
      setDrafts(draftsFromAdditional(detail.additional_line_items ?? []));
    }
  }, [detail]);

  const additionalItems = useMemo(() => parseDraftLines(drafts), [drafts]);

  return (
    <div className="w-full lg:w-[420px] shrink-0">
      <Card className="sticky top-4">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Invoice detail</h2>
            <button
              type="button"
              onClick={onClose}
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
                    detailTab === "edit" ? "bg-purple-600 text-white" : "text-gray-600 hover:bg-purple-50"
                  }`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab("preview")}
                  className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md ${
                    detailTab === "preview" ? "bg-purple-600 text-white" : "text-gray-600 hover:bg-purple-50"
                  }`}
                >
                  Preview
                </button>
              </div>

              {detailTab === "preview" ? (
                <InvoiceHtmlPreview detail={detail} additionalItems={additionalItems} dueDate={dueDate} />
              ) : (
                <InvoiceSendModule
                  detail={detail}
                  drafts={drafts}
                  setDrafts={setDrafts}
                  dueDate={dueDate}
                  setDueDate={setDueDate}
                  onSuccess={onSuccess}
                  onError={onError}
                  onRefreshList={onRefreshList}
                  onReloadDetail={onReloadDetail}
                  onDeleted={onDeleted}
                />
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
  );
}
