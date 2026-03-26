"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Pagination, usePagination } from "@/components/ui/pagination";
import { exportToCSV } from "@/lib/utils/csv-export";
import { formatDate } from "@/lib/utils/date-helpers";
import { adminFetch } from "@/lib/utils/admin-fetch";

import { useBookings } from "./hooks/useBookings";
import { TodaySummary } from "./components/TodaySummary";
import BookingFilters from "./components/BookingFilters";
import BookingTable from "./components/BookingTable";
import { BookingDetailPanel } from "./components/BookingDetailPanel";
import CreateBookingForm from "./components/CreateBookingForm";
import type { BookingRow } from "./types";

export default function AdminBookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <div role="status" aria-label="Loading bookings" className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <AdminBookingsContent />
    </Suspense>
  );
}

function AdminBookingsContent() {
  const searchParams = useSearchParams();
  const {
    bookings, vehicles, allCustomers, loading,
    error, success, setError, setSuccess,
    statusFilter, setStatusFilter,
    searchQuery, setSearchQuery,
    sortField, sortOrder, setSort,
    fetchBookings, updateStatus, bulkUpdateStatus, updating,
    todayPickups, todayReturns, overdueBookings,
  } = useBookings();

  // UI state
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [prefillApplied, setPrefillApplied] = useState(false);

  const { currentPage, pageSize, handlePageChange, handlePageSizeChange, resetPage, paginateArray } = usePagination(10);

  // Prefill from URL params (e.g., navigated from customer panel)
  const [prefillData, setPrefillData] = useState<{
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  } | undefined>(undefined);

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
      setShowCreateForm(true);
      setPrefillApplied(true);
    }
  }, [searchParams, prefillApplied]);

  // Reset page when filters change
  useEffect(() => {
    resetPage();
  }, [statusFilter, searchQuery, resetPage]);

  // Paginate bookings
  const paginatedBookings = paginateArray(bookings);

  // Selection handlers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const currentPageIds = paginatedBookings.map((b) => b.id);
    const allSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      currentPageIds.forEach((id) => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  }, [paginatedBookings, selectedIds]);

  // Bulk actions
  const handleBulkUpdate = useCallback(async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    await bulkUpdateStatus(selectedIds, newStatus);
    setSelectedIds(new Set());
    setBulkUpdating(false);
  }, [selectedIds, bulkUpdateStatus]);

  const handleBulkEmail = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    try {
      let sentCount = 0;
      let failCount = 0;
      for (const id of selectedIds) {
        try {
          const res = await adminFetch("/api/admin/send-booking-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId: id }),
          });
          if (!res.ok) { failCount++; continue; }
          const data = await res.json();
          if (data.success) sentCount++;
          else failCount++;
        } catch {
          failCount++;
        }
      }
      if (sentCount > 0) {
        setSuccess(`Sent ${sentCount} booking email${sentCount > 1 ? "s" : ""}`);
      }
      if (failCount > 0) {
        setError(`Failed to send ${failCount} email${failCount > 1 ? "s" : ""}`);
      }
      setSelectedIds(new Set());
    } finally {
      setBulkUpdating(false);
    }
  }, [selectedIds, setSuccess, setError]);

  // CSV export
  const handleExportCSV = useCallback(() => {
    const exportData = bookings.map((b) => ({
      "Booking ID": b.id,
      "Customer Name": b.customer_name,
      Email: b.customer_email,
      Vehicle: b.vehicleName,
      "Pickup Date": formatDate(b.pickup_date),
      "Return Date": formatDate(b.return_date),
      Status: b.status,
      "Total Amount": `$${(b.total_price ?? 0).toFixed(2)}`,
      Paid: `$${(b.deposit ?? 0).toFixed(2)}`,
      Balance: `$${((b.total_price ?? 0) - (b.deposit ?? 0)).toFixed(2)}`,
      "Payment Method": b.payment_method || "stripe",
      "Created Date": formatDate(b.created_at),
    }));
    exportToCSV(exportData, `bookings-export-${new Date().toISOString().split("T")[0]}`);
  }, [bookings]);

  // Detail panel handlers
  const handleSelectBooking = useCallback((booking: BookingRow) => {
    setSelectedBooking(booking);
    setShowDetail(true);
  }, []);

  const handleUpdateBookingInList = useCallback((updated: BookingRow) => {
    setSelectedBooking(updated);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setShowDetail(false);
    // Refresh the list to pick up any changes made in the detail panel
    fetchBookings();
  }, [fetchBookings]);

  return (
    <>
      {/* Page Header */}
      <section className="bg-gradient-to-br from-gray-900 to-purple-900 py-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-purple-300 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">All Bookings</h1>
              <p className="mt-1 text-purple-200">Manage and track all reservations.</p>
            </div>
          </div>
        </div>
      </section>

      <PageContainer className="py-8">
        {/* Toast Messages */}
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

        {/* Today's Summary Strip */}
        <TodaySummary
          todayPickups={todayPickups}
          todayReturns={todayReturns}
          overdueBookings={overdueBookings}
          onSelectBooking={handleSelectBooking}
        />

        {/* Filters, Search, Bulk Actions */}
        <BookingFilters
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
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
          bulkUpdating={bulkUpdating}
        />

        {/* Create Booking Form */}
        {showCreateForm && (
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

        {/* Bookings Table */}
        <BookingTable
          bookings={paginatedBookings}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onSelectBooking={handleSelectBooking}
          onUpdateStatus={updateStatus}
          updating={updating}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={setSort}
        />

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={bookings.length}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </PageContainer>

      {/* Booking Detail Panel */}
      {showDetail && selectedBooking && (
        <BookingDetailPanel
          booking={selectedBooking}
          vehicles={vehicles}
          onClose={handleCloseDetail}
          onUpdateBooking={handleUpdateBookingInList}
          onUpdateStatus={updateStatus}
          onError={setError}
          onSuccess={setSuccess}
        />
      )}
    </>
  );
}
