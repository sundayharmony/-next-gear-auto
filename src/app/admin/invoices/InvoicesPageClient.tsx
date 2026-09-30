"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Loader2, RefreshCw, Search } from "lucide-react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { useAutoToast } from "@/lib/hooks/useAutoToast";
import {
  AdminPageHeader,
  AdminPageBody,
  AdminTableWrap,
} from "@/components/admin/admin-shell";
import { AdminStatusBanner, AdminEmptyState } from "@/components/admin/ui-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  type InvoicePaymentStatus,
} from "@/lib/invoices/invoice-status";
import { formatDate } from "@/lib/utils/date-helpers";
import { InvoicePreviewPanel } from "./invoice-preview-panel";
import { fmt, type InvoiceDetail, type InvoiceListRow } from "./invoice-types";
import { RecordsHubTabs } from "@/app/admin/tickets/records-hub-tabs";
import { RecordsHubSubnav } from "@/app/admin/tickets/records-hub-subnav";
import { displayDocumentNumber } from "@/lib/documents/short-document-number";
import { InvoiceCreateForm } from "./invoice-create-form";

interface InvoicesPageClientProps {
  bookingsHref: string;
  isAdmin?: boolean;
  embeddedInRecordsHub?: boolean;
  recordsHubPanelBase?: string;
}

export function InvoicesPageClient({
  bookingsHref,
  isAdmin = false,
  embeddedInRecordsHub = false,
  recordsHubPanelBase = "/admin",
}: InvoicesPageClientProps) {
  const searchParams = useSearchParams();
  const { error, setError, success, setSuccess } = useAutoToast();
  const [invoices, setInvoices] = useState<InvoiceListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | InvoicePaymentStatus>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [creating, setCreating] = useState(false);

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

  const loadDetail = useCallback(
    async (invoiceId: string) => {
      setDetailLoading(true);
      try {
        const res = await adminFetch(`/api/admin/invoices/${invoiceId}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setDetail(data.data as InvoiceDetail);
        } else {
          setError(data.message || "Failed to load invoice");
        }
      } catch {
        setError("Network error — could not load invoice");
      } finally {
        setDetailLoading(false);
      }
    },
    [setError],
  );

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId);
    } else {
      setDetail(null);
    }
  }, [selectedId, loadDetail]);

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

  const filtered = useMemo(() => invoices, [invoices]);

  if (creating) {
    return (
      <>
        <AdminPageHeader
          title={embeddedInRecordsHub ? "Tickets & billing" : "Invoices"}
          subtitle="Create an invoice from a booking"
          onBack={() => setCreating(false)}
          backLabel="Back to invoices"
        >
          {embeddedInRecordsHub ? (
            <RecordsHubTabs panelBase={recordsHubPanelBase} className="mt-4" />
          ) : null}
        </AdminPageHeader>
        <AdminPageBody>
          {embeddedInRecordsHub ? <RecordsHubSubnav panelBase={recordsHubPanelBase} /> : null}
          {error && (
            <AdminStatusBanner type="error" message={error} onDismiss={() => setError(null)} />
          )}
          <InvoiceCreateForm
            onCancel={() => setCreating(false)}
            onError={setError}
            onCreated={(invoiceId, existed) => {
              setCreating(false);
              setSelectedId(invoiceId);
              setSuccess(existed ? "Opened the invoice already on this booking" : "Invoice created");
              void loadList();
            }}
          />
        </AdminPageBody>
      </>
    );
  }

  if (selectedId) {
    const number = displayDocumentNumber(detail?.id || selectedId);
    return (
      <>
        <AdminPageHeader
          title={`Invoice ${number}`}
          subtitle={detail?.customer_name || "Invoice detail"}
          onBack={() => {
            setSelectedId(null);
            setDetail(null);
          }}
          backLabel="Back to invoices"
        >
          {embeddedInRecordsHub ? (
            <RecordsHubTabs panelBase={recordsHubPanelBase} className="mt-4" />
          ) : null}
        </AdminPageHeader>
        <AdminPageBody>
          {embeddedInRecordsHub ? <RecordsHubSubnav panelBase={recordsHubPanelBase} /> : null}
          {error && (
            <AdminStatusBanner type="error" message={error} onDismiss={() => setError(null)} />
          )}
          {success && (
            <AdminStatusBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
          )}
          <InvoicePreviewPanel
            detailLoading={detailLoading}
            detail={detail}
            bookingsHref={bookingsHref}
            onClose={() => {
              setSelectedId(null);
              setDetail(null);
            }}
            onSuccess={setSuccess}
            onError={setError}
            onRefreshList={loadList}
            onReloadDetail={loadDetail}
            onDeleted={() => {
              setSelectedId(null);
              setDetail(null);
              void loadList();
            }}
          />
        </AdminPageBody>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={embeddedInRecordsHub ? "Tickets & billing" : "Invoices"}
        subtitle="View sent invoices, edit line items, and track payment status from live booking balances."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="bg-white text-purple-900 hover:bg-purple-50" onClick={() => setCreating(true)}>
              New invoice
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadList}
              disabled={loading}
              className="page-hero-btn-outline"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      >
        {embeddedInRecordsHub ? (
          <RecordsHubTabs panelBase={recordsHubPanelBase} className="mt-4" />
        ) : null}
      </AdminPageHeader>
      <AdminPageBody>
        {embeddedInRecordsHub ? <RecordsHubSubnav panelBase={recordsHubPanelBase} /> : null}
        {error && (
          <AdminStatusBanner type="error" message={error} onDismiss={() => setError(null)} />
        )}
        {success && (
          <AdminStatusBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
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

            {loading ? (
              <p className="py-8 text-center text-sm text-gray-500">Loading invoices…</p>
            ) : filtered.length === 0 ? (
              <AdminEmptyState
                title="No invoices yet"
                description="Open a booking and use Send invoice to create your first invoice. Admins can backfill older bookings below."
                action={
                  <div className="flex flex-col sm:flex-row gap-2 items-center justify-center">
                    <Button asChild>
                      <Link href={bookingsHref}>Go to bookings</Link>
                    </Button>
                    {isAdmin ? (
                      <Button variant="outline" onClick={handleBackfill} disabled={backfilling}>
                        {backfilling ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                        Import from history
                      </Button>
                    ) : null}
                  </div>
                }
              />
            ) : (
              <>
              <div className="lg:hidden space-y-2">
                {filtered.map((inv) => (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => setSelectedId(inv.id)}
                    className={`w-full text-left rounded-lg border p-4 transition-colors ${
                      selectedId === inv.id ? "border-purple-400 bg-purple-50" : "border-gray-200 bg-white hover:border-purple-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-purple-700">#{displayDocumentNumber(inv.id)}</p>
                        <p className="font-medium text-gray-900 truncate">{inv.customer_name || "—"}</p>
                        <p className="text-xs text-gray-500 truncate">{inv.customer_email}</p>
                        <p className="text-sm text-gray-600 mt-1">{inv.vehicleName}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Due {formatDate(inv.due_date)} · Balance {fmt(inv.liveBalance)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge className={INVOICE_STATUS_COLORS[inv.paymentStatus]}>
                          {INVOICE_STATUS_LABELS[inv.paymentStatus]}
                        </Badge>
                        <ChevronRight className="h-5 w-5 text-gray-400" aria-hidden />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <AdminTableWrap className="hidden lg:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-xs text-gray-500 uppercase">
                      <th className="px-4 py-3">Invoice #</th>
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
                        <td className="px-4 py-3 font-mono font-semibold text-gray-900">
                          {displayDocumentNumber(inv.id)}
                        </td>
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
              </AdminTableWrap>
              {isAdmin ? (
                <p className="text-xs text-gray-500 pt-2">
                  Missing older invoices?{" "}
                  <button
                    type="button"
                    className="text-purple-600 hover:underline disabled:opacity-50"
                    onClick={handleBackfill}
                    disabled={backfilling}
                  >
                    Import from booking history
                  </button>
                </p>
              ) : null}
              </>
            )}
          </div>

          {selectedId && (
            <InvoicePreviewPanel
              detailLoading={detailLoading}
              detail={detail}
              bookingsHref={bookingsHref}
              onClose={() => setSelectedId(null)}
              onSuccess={setSuccess}
              onError={setError}
              onRefreshList={loadList}
              onReloadDetail={loadDetail}
              onDeleted={() => {
                setSelectedId(null);
                setDetail(null);
              }}
            />
          )}
        </div>
      </AdminPageBody>
    </>
  );
}
