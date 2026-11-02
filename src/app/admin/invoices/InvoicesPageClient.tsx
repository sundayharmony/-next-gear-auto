"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, Plus, RefreshCw, Search } from "lucide-react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { useAutoToast } from "@/lib/hooks/useAutoToast";
import { AdminPageHeader, AdminPageBody } from "@/components/admin/admin-shell";
import { AdminStatusBanner, AdminEmptyState } from "@/components/admin/ui-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RecordsHubChip, RecordsHubChipGroup, RecordsHubHeroStats, RecordsHubRecordRow } from "@/app/admin/tickets/records-hub-list";
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
  }, [setError]);

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

  const statusCounts = useMemo(() => {
    const counts = { all: invoices.length, unpaid: 0, partial: 0, overdue: 0, paid: 0 };
    for (const inv of invoices) counts[inv.paymentStatus] += 1;
    return counts;
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== "all" && inv.paymentStatus !== statusFilter) return false;
      if (!q) return true;
      return `${inv.customer_name || ""} ${inv.customer_email || ""} ${inv.booking_id} ${displayDocumentNumber(inv.id)}`
        .toLowerCase()
        .includes(q);
    });
  }, [invoices, search, statusFilter]);

  const outstanding = invoices
    .filter((inv) => inv.paymentStatus !== "paid")
    .reduce((sum, inv) => sum + (Number(inv.liveBalance) || 0), 0);
  const chargesTotal = invoices.reduce((sum, inv) => sum + (Number(inv.charges_total) || 0), 0);

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
          <>
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
            <Button size="sm" className="bg-white text-purple-900 hover:bg-purple-50" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New invoice
            </Button>
          </>
        }
      >
        {embeddedInRecordsHub ? (
          <RecordsHubTabs panelBase={recordsHubPanelBase} className="mt-4" />
        ) : null}
        <RecordsHubHeroStats
          stats={[
            { value: invoices.length, label: "Total Invoices" },
            { value: statusCounts.unpaid + statusCounts.overdue, label: "Unpaid", valueClassName: "text-red-300" },
            { value: fmt(outstanding), label: "Outstanding Amount" },
            { value: fmt(chargesTotal), label: "Total Amount" },
          ]}
        />
      </AdminPageHeader>
      <AdminPageBody>
        {embeddedInRecordsHub ? <RecordsHubSubnav panelBase={recordsHubPanelBase} /> : null}
        {error && (
          <AdminStatusBanner type="error" message={error} onDismiss={() => setError(null)} />
        )}
        {success && (
          <AdminStatusBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
        )}

        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <RecordsHubChipGroup>
                {(["all", "unpaid", "partial", "overdue", "paid"] as const).map((s) => (
                  <RecordsHubChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
                    {s} ({statusCounts[s]})
                  </RecordsHubChip>
                ))}
              </RecordsHubChipGroup>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search customer, email, invoice #…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {loading ? (
              <p className="py-8 text-center text-sm text-gray-500">Loading invoices…</p>
            ) : filtered.length === 0 ? (
              <AdminEmptyState
                title="No invoices found"
                description={
                  invoices.length === 0
                    ? "Create an invoice from a booking."
                    : "Try adjusting your filters."
                }
                action={
                  invoices.length === 0 ? (
                    <Button onClick={() => setCreating(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      New invoice
                    </Button>
                  ) : null
                }
              />
            ) : (
              <div className="space-y-2">
                {filtered.map((inv) => (
                  <RecordsHubRecordRow
                    key={inv.id}
                    onClick={() => setSelectedId(inv.id)}
                    icon={<FileText className="h-5 w-5" />}
                    iconClassName="bg-purple-100 text-purple-600"
                    title={`#${displayDocumentNumber(inv.id)}`}
                    badges={
                      <Badge className={`text-xs border ${INVOICE_STATUS_COLORS[inv.paymentStatus]}`}>
                        {INVOICE_STATUS_LABELS[inv.paymentStatus]}
                      </Badge>
                    }
                    meta={
                      <>
                        <span>{inv.customer_name || "—"}</span>
                        {inv.vehicleName ? <span>{inv.vehicleName}</span> : null}
                        <span>Due {formatDate(inv.due_date)}</span>
                      </>
                    }
                    trailing={
                      <p className={`text-lg font-bold ${inv.paymentStatus === "paid" ? "text-green-600" : "text-red-600"}`}>
                        {fmt(inv.liveBalance)}
                      </p>
                    }
                  />
                ))}
              </div>
            )}
            {isAdmin ? (
              <p className="text-xs text-gray-500">
                Missing older invoices?{" "}
                <button
                  type="button"
                  className="text-purple-600 hover:underline disabled:opacity-50"
                  onClick={handleBackfill}
                  disabled={backfilling}
                >
                  {backfilling ? "Importing…" : "Import from booking history"}
                </button>
              </p>
            ) : null}
        </div>
      </AdminPageBody>
    </>
  );
}
