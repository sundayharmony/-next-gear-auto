"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { useAutoToast } from "@/lib/hooks/useAutoToast";
import type { VehicleListItem, BookingDbRow } from "@/lib/types";
import {
  Ticket,
  Plus,
  Check,
  Car,
  Calendar,
  AlertCircle,
  RefreshCw,
  MapPin,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminPageBody, AdminPageHeader } from "@/components/admin/admin-shell";
import { Pagination, usePagination } from "@/components/ui/pagination";
import { formatDate } from "@/lib/utils/date-helpers";
import { logger } from "@/lib/utils/logger";
import { getStaffVehicleDetailsHref } from "@/lib/admin/staff-vehicle-links";
import { adminPanelConfig, type StaffPanelConfig } from "@/lib/admin/staff-panel-config";
import { STATUS_COLORS, TYPE_COLORS, type TicketRecord } from "./tickets-shared";
import {
  TicketDetailView,
  TicketEditPanel,
  TicketForm,
  type TicketFormState,
} from "./ticket-detail-panel";

type Vehicle = VehicleListItem;
type Booking = BookingDbRow;

const emptyForm = (): TicketFormState => ({
  bookingId: "",
  vehicleId: "",
  licensePlate: "",
  ticketType: "traffic",
  violationDate: new Date().toISOString().split("T")[0],
  state: "NJ",
  municipality: "",
  courtId: "",
  prefix: "",
  ticketNumber: "",
  amountDue: "",
  status: "unpaid",
  notes: "",
});

export default function AdminTicketsPage({
  panelConfig = adminPanelConfig,
}: {
  panelConfig?: StaffPanelConfig;
}) {
  const panelBase = panelConfig.panelBase;
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const { error, setError, success, setSuccess } = useAutoToast();
  const [statusFilter, setStatusFilter] = useState<"all" | "unpaid" | "paid" | "disputed" | "dismissed">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "traffic" | "parking">("all");
  const [adding, setAdding] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { currentPage, pageSize, handlePageChange, handlePageSizeChange, resetPage, paginateArray } = usePagination(10);

  const [form, setForm] = useState<TicketFormState>(emptyForm);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ticketsResult, vehiclesResult, bookingsResult] = await Promise.allSettled([
        adminFetch("/api/admin/tickets"),
        adminFetch("/api/admin/vehicles"),
        adminFetch("/api/admin/bookings"),
      ]);

      let allFailed = true;

      if (ticketsResult.status === "fulfilled" && ticketsResult.value.ok) {
        const ticketsData = await ticketsResult.value.json();
        setTickets(ticketsData.data || []);
        allFailed = false;
      } else if (ticketsResult.status === "rejected") {
        logger.error("Tickets fetch rejected:", ticketsResult.reason);
      }

      if (vehiclesResult.status === "fulfilled" && vehiclesResult.value.ok) {
        const vehiclesData = await vehiclesResult.value.json();
        setVehicles(vehiclesData.data || []);
        allFailed = false;
      } else if (vehiclesResult.status === "rejected") {
        logger.error("Vehicles fetch rejected:", vehiclesResult.reason);
      }

      if (bookingsResult.status === "fulfilled" && bookingsResult.value.ok) {
        const bookingsData = await bookingsResult.value.json();
        setBookings(bookingsData.data || []);
        allFailed = false;
      } else if (bookingsResult.status === "rejected") {
        logger.error("Bookings fetch rejected:", bookingsResult.reason);
      }

      if (allFailed) {
        setError("Failed to load tickets and related data");
      }
    } catch (err) {
      logger.error("Error fetching tickets:", err);
      setError(err instanceof Error ? err.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setForm(emptyForm());
  };

  const populateFormFromTicket = (t: TicketRecord) => {
    setForm({
      bookingId: t.bookingId || "",
      vehicleId: t.vehicleId || "",
      licensePlate: t.licensePlate,
      ticketType: t.ticketType,
      violationDate: t.violationDate,
      state: t.state,
      municipality: t.municipality,
      courtId: t.courtId,
      prefix: t.prefix,
      ticketNumber: t.ticketNumber,
      amountDue: String(t.amountDue),
      status: t.status,
      notes: t.notes,
    });
  };

  const handleBookingSelect = (bookingId: string) => {
    setForm((f) => ({ ...f, bookingId }));
    if (bookingId) {
      const booking = bookings.find((b) => b.id === bookingId);
      if (booking) {
        setForm((f) => ({
          ...f,
          bookingId,
          vehicleId: booking.vehicle_id || f.vehicleId,
        }));
      }
    }
  };

  const handleCreate = async () => {
    if (!form.violationDate) {
      setError("Violation date is required");
      return;
    }
    const parsedAmount = parseFloat(form.amountDue);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setError("Amount due must be a non-negative number");
      return;
    }
    try {
      setIsSubmitting(true);
      let customerId = "";
      if (form.bookingId) {
        const booking = bookings.find((b) => b.id === form.bookingId);
        if (booking) customerId = booking.customer_id ?? "";
      }

      const res = await adminFetch("/api/admin/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          customerId: customerId || null,
          amountDue: parseFloat(form.amountDue) || 0,
        }),
      });
      if (!res.ok) throw new Error("Failed to create ticket");
      resetForm();
      setAdding(false);
      fetchData();
    } catch (err) {
      logger.error("Error creating ticket:", err);
      setError("Failed to create ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedTicket) return;
    setIsSubmitting(true);
    try {
      let customerId = selectedTicket.customerId || "";
      if (form.bookingId) {
        const booking = bookings.find((b) => b.id === form.bookingId);
        if (booking) customerId = booking.customer_id ?? "";
      }

      const parsedAmount = parseFloat(form.amountDue);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        setError("Amount due must be a non-negative number");
        setIsSubmitting(false);
        return;
      }

      const res = await adminFetch("/api/admin/tickets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTicket.id,
          ...form,
          customerId: customerId || null,
          amountDue: parsedAmount,
        }),
      });
      if (!res.ok) throw new Error("Failed to update ticket");
      setEditMode(false);
      setSelectedTicket(null);
      fetchData();
    } catch (err) {
      logger.error("Error updating ticket:", err);
      setError("Failed to update ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await adminFetch(`/api/admin/tickets?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete ticket");
      setDeleteConfirm(null);
      setSelectedTicket(null);
      fetchData();
    } catch (err) {
      logger.error("Error deleting ticket:", err);
      setError("Failed to delete ticket");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => { resetPage(); }, [statusFilter, typeFilter]);

  const filtered = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (typeFilter !== "all" && t.ticketType !== typeFilter) return false;
    return true;
  });

  const statusCounts = {
    all: tickets.length,
    unpaid: tickets.filter((t) => t.status === "unpaid").length,
    paid: tickets.filter((t) => t.status === "paid").length,
    disputed: tickets.filter((t) => t.status === "disputed").length,
    dismissed: tickets.filter((t) => t.status === "dismissed").length,
  };

  const totalUnpaid = tickets
    .filter((t) => t.status === "unpaid")
    .reduce((s, t) => s + (t.amountDue ?? 0), 0);

  const totalAll = tickets.reduce((s, t) => s + (t.amountDue ?? 0), 0);

  if (selectedTicket && !editMode) {
    return (
      <TicketDetailView
        ticket={selectedTicket}
        panelBase={panelBase}
        deleteConfirm={deleteConfirm}
        isDeleting={isDeleting}
        onBack={() => setSelectedTicket(null)}
        onEdit={() => {
          populateFormFromTicket(selectedTicket);
          setEditMode(true);
        }}
        onDeleteConfirm={() => setDeleteConfirm(selectedTicket.id)}
        onDeleteCancel={() => setDeleteConfirm(null)}
        onDelete={() => handleDelete(selectedTicket.id)}
      />
    );
  }

  if (selectedTicket && editMode) {
    return (
      <TicketEditPanel
        form={form}
        setForm={setForm}
        bookings={bookings}
        vehicles={vehicles}
        onBookingSelect={handleBookingSelect}
        onSubmit={handleUpdate}
        onCancel={() => {
          setEditMode(false);
          setSelectedTicket(null);
        }}
        isSubmitting={isSubmitting}
      />
    );
  }

  if (loading) {
    return (
      <AdminPageBody>
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      </AdminPageBody>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Tickets"
        subtitle="Traffic & parking violations linked to trips"
        actions={
          <>
            <Button
              onClick={fetchData}
              variant="outline"
              size="sm"
              className="page-hero-btn-outline"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={() => { resetForm(); setAdding(true); }}
              size="sm"
              className="bg-white text-purple-900 hover:bg-purple-50"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Ticket
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-2xl font-bold">{tickets.length}</p>
            <p className="text-xs page-hero-subtitle">Total Tickets</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-2xl font-bold text-red-300">{statusCounts.unpaid}</p>
            <p className="text-xs page-hero-subtitle">Unpaid</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-2xl font-bold">${totalUnpaid.toLocaleString()}</p>
            <p className="text-xs page-hero-subtitle">Outstanding Amount</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-2xl font-bold">${totalAll.toLocaleString()}</p>
            <p className="text-xs page-hero-subtitle">Total Amount</p>
          </div>
        </div>
      </AdminPageHeader>

      <AdminPageBody>
        {success && (
          <div className="mb-6 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
            <Check className="h-4 w-4 shrink-0" />
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {adding && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">New Ticket</h2>
            <TicketForm
              form={form}
              setForm={setForm}
              bookings={bookings}
              vehicles={vehicles}
              onBookingSelect={handleBookingSelect}
              onSubmit={handleCreate}
              onCancel={() => {
                setAdding(false);
                resetForm();
              }}
              isEdit={false}
              isSubmitting={isSubmitting}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(["all", "unpaid", "paid", "disputed", "dismissed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors capitalize ${
                  statusFilter === s
                    ? "bg-white text-gray-900 font-medium shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {s} ({statusCounts[s]})
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(["all", "traffic", "parking"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors capitalize ${
                  typeFilter === t
                    ? "bg-white text-gray-900 font-medium shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No tickets found</p>
              <p className="text-sm text-gray-400 mt-1">
                {tickets.length === 0
                  ? "Add your first ticket to start tracking violations"
                  : "Try adjusting your filters"}
              </p>
              {tickets.length === 0 && (
                <Button
                  onClick={() => { resetForm(); setAdding(true); }}
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Ticket
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
          <div className="space-y-2">
            {paginateArray(filtered).map((t) => (
              <Card
                key={t.id}
                className="cursor-pointer hover:shadow-md hover:border-purple-200 transition-all focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 outline-none"
                onClick={() => setSelectedTicket(t)}
                tabIndex={0}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      t.ticketType === "traffic" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                    }`}>
                      {t.ticketType === "traffic" ? <Car className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">
                          {t.prefix && t.ticketNumber
                            ? `${t.prefix}-${t.ticketNumber}`
                            : t.ticketType === "traffic" ? "Traffic Violation" : "Parking Violation"}
                        </span>
                        <Badge className={`text-xs ${TYPE_COLORS[t.ticketType]}`}>
                          {t.ticketType}
                        </Badge>
                        <Badge className={`text-xs border ${STATUS_COLORS[t.status]}`}>
                          {t.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {t.municipality && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{t.municipality}{t.state ? `, ${t.state}` : ""}</span>}
                        <span className="flex items-center gap-0.5"><Calendar className="h-3 w-3" />{formatDate(t.violationDate)}</span>
                        {t.vehicleName && (
                          <span className="flex items-center gap-0.5">
                            <Car className="h-3 w-3" />
                            {t.vehicleId ? (
                              <Link
                                href={getStaffVehicleDetailsHref(t.vehicleId, panelBase)}
                                className="hover:text-purple-700 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {t.vehicleName}
                              </Link>
                            ) : (
                              t.vehicleName
                            )}
                          </span>
                        )}
                        {t.customerName && <span>Driver: {t.customerName}</span>}
                        {t.licensePlate && <span className="font-mono">{t.licensePlate}</span>}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={`text-lg font-bold ${t.status === "unpaid" ? "text-red-600" : t.status === "paid" ? "text-green-600" : "text-gray-600"}`}>
                        ${t.amountDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
          </>
        )}
      </AdminPageBody>
    </>
  );
}
