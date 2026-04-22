"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Pagination, usePagination } from "@/components/ui/pagination";
import { exportToCSV } from "@/lib/utils/csv-export";
import { formatDate } from "@/lib/utils/date-helpers";
import { getVehicleDisplayName } from "@/lib/types";
import { adminFetch } from "@/lib/utils/admin-fetch";

import { useBookings } from "./hooks/useBookings";
import { TodaySummary } from "./components/TodaySummary";
import BookingFilters from "./components/BookingFilters";
import BookingTable from "./components/BookingTable";
import { BookingDetailPanel } from "./components/BookingDetailPanel";
import CreateBookingForm from "./components/CreateBookingForm";
import type { BookingRow } from "./types";
import type { BookingsPageConfig } from "./config";

interface SharedBookingsPageProps {
  config: BookingsPageConfig;
}

export function SharedBookingsPage({ config }: SharedBookingsPageProps) {
  const searchParams = useSearchParams();
  const {
    bookings, vehicles, allCustomers, loading,
    error, success, setError, setSuccess,
    statusFilter, setStatusFilter,
    vehicleFilter, setVehicleFilter,
    searchQuery, setSearchQuery,
    sortField, sortOrder, setSort,
    fetchBookings, updateStatus, bulkUpdateStatus, updating,
    todayPickups, todayReturns, overdueBookings,
  } = useBookings(config);

  // UI state
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [prefillApplied, setPrefillApplied] = useState(false);
  const detailDirtyRef = React.useRef(false);

  const { currentPage, pageSize, handlePageChange, handlePageSizeChange, resetPage, paginateArray } = usePagination(10);

  const [prefillData, setPrefillData] = useState<{
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  } | undefined>(undefined);

  const [highlightApplied, setHighlightApplied] = useState(false);

  useEffect(() => {
    if (highlightApplied || loading) return;
    const highlightId = searchParams.get("booking") || searchParams.get("highlight");
    if (highlightId && bookings.length > 0) {
      const found = bookings.find(b => b.id === highlightId);
      if (found) {
        setSelectedBooking(found);
        setShowDetail(true);
      }
      setHighlightApplied(true);
    }
  }, [searchParams, bookings, loading, highlightApplied]);

  useEffect(() => {
    if (prefillApplied) return;
    const customerName = searchParams.get("customerName");
    const customerEmail = searchParams.get("customerEmail");
    if (customerName || customerEmail) {
      setPrefillData({
        customerName: customerName || undefined,
        customerEmail: customerEmail || undefined,
        customerPhone: searchParams.get("customerPhone") || undefined,
      });
      if (config.capabilities.canCreateBookings) {
        setShowCreateForm(true);
      }
      setPrefillApplied(true);
    }
  }, [searchParams, prefillApplied, config.capabilities.canCreateBookings]);

  useEffect(() => {
    resetPage();
  }, [statusFilter, vehicleFilter, searchQuery, resetPage]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error, setError]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(timer);
  }, [success, setSuccess]);

  const vehicleOptions = React.useMemo(() => {
    const uniqueNames = new Map<string, string>();
    vehicles.forEach((v) => {
      const name = getVehicleDisplayName(v);
      if (!uniqueNames.has(name)) uniqueNames.set(name, v.id);
    });
    return Array.from(uniqueNames.entries())
      .map(([name, id]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [vehicles]);

  const paginatedBookings = paginateArray(bookings);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const currentPageIds = paginatedBookings
      .filter((b) => config.capabilities.canBulkUpdate || b.canManage !== false)
      .map((b) => b.id);
    const allSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.has(id));
    setSelectedIds(() => {
      if (allSelected) {
        const next = new Set(selectedIds);
        currentPageIds.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set<string>();
      currentPageIds.forEach((id) => next.add(id));
      return next;
    });
  }, [config.capabilities.canBulkUpdate, paginatedBookings, selectedIds]);

  const handleBulkUpdate = useCallback(async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    try {
      await bulkUpdateStatus(selectedIds, newStatus);
      setSelectedIds(new Set());
    } finally {
      setBulkUpdating(false);
    }
  }, [selectedIds, bulkUpdateStatus]);

  const handleBulkEmail = useCallback(async () => {
    if (!config.capabilities.canBulkEmail || !config.sendBookingEmailEndpoint) return;
    if (bulkSending) return;
    if (selectedIds.size === 0) return;
    setBulkSending(true);
    try {
      const ids = Array.from(selectedIds);
      let sentCount = 0;
      let failCount = 0;
      const batchSize = 5;

      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const promises = batch.map((id) =>
          adminFetch(config.sendBookingEmailEndpoint!, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId: id }),
          })
            .then(async (res) => {
              if (!res.ok) return false;
              const data = await res.json();
              return data?.success ?? false;
            })
            .catch(() => false)
        );

        const results = await Promise.allSettled(promises);
        results.forEach((result) => {
          if (result.status === "fulfilled" && result.value) sentCount++;
          else failCount++;
        });
      }

      if (sentCount > 0) {
        setSuccess(`Sent ${sentCount} booking email${sentCount !== 1 ? "s" : ""}`);
      }
      if (failCount > 0) {
        setError(`Failed to send ${failCount} email${failCount !== 1 ? "s" : ""}`);
      }
      setSelectedIds(new Set());
    } finally {
      setBulkSending(false);
    }
  }, [bulkSending, config.capabilities.canBulkEmail, config.sendBookingEmailEndpoint, selectedIds, setError, setSuccess]);

  const handleExportCSV = useCallback(() => {
    if (!config.capabilities.canExportCsv) return;
    const exportData = bookings.map((b) => ({
      "Booking ID": b.id,
      "Customer Name": b.customer_name,
      Email: b.customer_email,
      Vehicle: b.vehicleName,
      "Pickup Date": formatDate(b.pickup_date),
      "Return Date": formatDate(b.return_date),
      Status: b.status,
      "Total Amount": b.canViewPricing === false ? "Hidden" : `$${(b.total_price ?? 0).toFixed(2)}`,
      Paid: b.canViewPricing === false ? "Hidden" : `$${(b.deposit ?? 0).toFixed(2)}`,
      Balance: b.canViewPricing === false ? "Hidden" : `$${((b.total_price ?? 0) - (b.deposit ?? 0)).toFixed(2)}`,
      "Payment Method": b.payment_method || "stripe",
      "Created Date": formatDate(b.created_at),
    }));
    exportToCSV(exportData, `bookings-export-${new Date().toISOString().split("T")[0]}`);
  }, [bookings, config.capabilities.canExportCsv]);

  const handleSelectBooking = useCallback((booking: BookingRow) => {
    setSelectedBooking(booking);
    setShowDetail(true);
  }, []);

  // Keep detail panel in sync with latest list row updates.
  useEffect(() => {
    if (!selectedBooking) return;
    const latest = bookings.find((b) => b.id === selectedBooking.id);
    if (!latest) {
      setShowDetail(false);
      setSelectedBooking(null);
      return;
    }
    if (latest !== selectedBooking) {
      setSelectedBooking(latest);
    }
  }, [bookings, selectedBooking]);

  const handleUpdateBookingInList = useCallback((updated: BookingRow) => {
    setSelectedBooking(updated);
    detailDirtyRef.current = true;
  }, []);

  const handleUpdateStatusFromDetail = useCallback(
    async (bookingId: string, newStatus: string) => {
      const ok = await updateStatus(bookingId, newStatus);
      if (!ok) return false;
      setSelectedBooking((prev) => (prev && prev.id === bookingId ? { ...prev, status: newStatus } : prev));
      detailDirtyRef.current = true;
      return true;
    },
    [updateStatus]
  );

  const handleCloseDetail = useCallback(() => {
    setShowDetail(false);
    if (detailDirtyRef.current) {
      detailDirtyRef.current = false;
      fetchBookings();
    }
  }, [fetchBookings]);

  return (
    <>
      <section className="bg-gradient-to-br from-gray-900 to-purple-900 py-6 sm:py-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href={config.homeHref} className="text-purple-300 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{config.title}</h1>
              <p className="mt-1 text-sm sm:text-base text-purple-200">{config.subtitle}</p>
            </div>
          </div>
        </div>
      </section>

      <PageContainer className="py-5 sm:py-8">
        {success && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 flex items-center justify-between">
            <span className="flex items-center gap-2"><Check className="h-4 w-4" />{success}</span>
            <button onClick={() => setSuccess(null)} aria-label="Dismiss success message" className="text-green-400 hover:text-green-600 ml-3">&times;</button>
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss error" className="text-red-400 hover:text-red-600 ml-3">&times;</button>
          </div>
        )}

        <TodaySummary
          todayPickups={todayPickups}
          todayReturns={todayReturns}
          overdueBookings={overdueBookings}
          onSelectBooking={handleSelectBooking}
        />

        <BookingFilters
          statusFilterPreset={config.mode === "manager" ? "manager" : "admin"}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          vehicleFilter={vehicleFilter}
          onVehicleChange={setVehicleFilter}
          vehicleOptions={vehicleOptions}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortField={sortField}
          sortOrder={sortOrder}
          bookingCount={bookings.length}
          loading={loading}
          onRefresh={fetchBookings}
          onExportCSV={handleExportCSV}
          onCreateNew={() => setShowCreateForm(true)}
          selectedCount={selectedIds.size}
          onBulkConfirm={() => handleBulkUpdate("confirmed")}
          onBulkStart={() => handleBulkUpdate("active")}
          onBulkComplete={() => handleBulkUpdate("completed")}
          onBulkCancel={() => handleBulkUpdate("cancelled")}
          onBulkEmail={handleBulkEmail}
          onClearSelection={() => setSelectedIds(new Set())}
          bulkUpdating={bulkUpdating || bulkSending}
          capabilities={{
            canExportCsv: config.capabilities.canExportCsv,
            canBulkUpdate: config.capabilities.canBulkUpdate,
            canBulkEmail: config.capabilities.canBulkEmail,
            canCreateBookings: config.capabilities.canCreateBookings,
          }}
        />

        {showCreateForm && config.capabilities.canCreateBookings && (
          <CreateBookingForm
            vehicles={vehicles}
            allCustomers={allCustomers}
            onClose={() => { setShowCreateForm(false); setPrefillData(undefined); }}
            onCreated={() => { setShowCreateForm(false); setPrefillData(undefined); fetchBookings(); }}
            onError={setError}
            onSuccess={setSuccess}
            prefillData={prefillData}
          />
        )}

        <BookingTable
          bookings={paginatedBookings}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onSelectBooking={handleSelectBooking}
          onUpdateStatus={handleUpdateStatusFromDetail}
          updating={updating}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={setSort}
          capabilities={{
            canSeePricingByDefault: config.mode === "admin",
          }}
        />

        <Pagination
          currentPage={currentPage}
          totalItems={bookings.length}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </PageContainer>

      {showDetail && selectedBooking && (
        <BookingDetailPanel
          booking={selectedBooking}
          vehicles={vehicles}
          onClose={handleCloseDetail}
          onUpdateBooking={handleUpdateBookingInList}
          onUpdateStatus={handleUpdateStatusFromDetail}
          onError={setError}
          onSuccess={setSuccess}
          capabilities={{
            canSendBookingEmail: config.capabilities.canSendBookingEmail,
            canViewAdminNotes: config.capabilities.canViewAdminNotes,
            canViewActivityTimeline: config.capabilities.canViewActivityTimeline,
            canManagePayments: config.capabilities.canManagePayments,
            canExtendBooking: config.capabilities.canExtendBooking,
            customerDetailsBasePath: config.customerDetailsBasePath,
            ticketsPagePath: config.ticketsPagePath,
          }}
        />
      )}
    </>
  );
}
