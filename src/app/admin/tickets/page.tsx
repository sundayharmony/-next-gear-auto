"use client";

import React, { useEffect, useState } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { useAutoToast } from "@/lib/hooks/useAutoToast";
import type { VehicleListItem, BookingDbRow } from "@/lib/types";
import {
  Ticket,
  Plus,
  Check,
  X,
  Pencil,
  Trash2,
  Car,
  Calendar,
  DollarSign,
  AlertCircle,
  RefreshCw,
  MapPin,
  FileText,
  Filter,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { Pagination, usePagination } from "@/components/ui/pagination";
import { formatDate } from "@/lib/utils/date-helpers";
import { logger } from "@/lib/utils/logger";

// ─── Types ────────────────────────────────────────────────────
interface TicketRecord {
  id: string;
  bookingId: string | null;
  customerId: string | null;
  vehicleId: string | null;
  licensePlate: string;
  ticketType: "traffic" | "parking";
  violationDate: string;
  state: string;
  municipality: string;
  courtId: string;
  prefix: string;
  ticketNumber: string;
  amountDue: number;
  status: "unpaid" | "paid" | "disputed" | "dismissed";
  notes: string;
  createdAt: string;
  vehicleName: string;
  customerName: string;
  bookingDates: string;
}

type Vehicle = VehicleListItem;
type Booking = BookingDbRow;

// ─── Constants ────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  unpaid: "bg-red-100 text-red-700 border-red-200",
  paid: "bg-green-100 text-green-700 border-green-200",
  disputed: "bg-amber-100 text-amber-700 border-amber-200",
  dismissed: "bg-gray-100 text-gray-600 border-gray-200",
};

const TYPE_COLORS: Record<string, string> = {
  traffic: "bg-blue-100 text-blue-700",
  parking: "bg-purple-100 text-purple-700",
};

// ─── Main Component ───────────────────────────────────────────
export default function AdminTicketsPage() {
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
  const { currentPage, pageSize, handlePageChange, handlePageSizeChange, resetPage, paginateArray } = usePagination(10);

  const [form, setForm] = useState({
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

  // ─── Data Fetching ──────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ticketsRes, vehiclesRes, bookingsRes] = await Promise.all([
        adminFetch("/api/admin/tickets"),
        adminFetch("/api/admin/vehicles"),
        adminFetch("/api/admin/bookings"),
      ]);

      if (!ticketsRes.ok) throw new Error("Failed to fetch tickets");

      const ticketsData = await ticketsRes.json();
      const vehiclesData = vehiclesRes.ok ? await vehiclesRes.json() : { data: [] };
      const bookingsData = bookingsRes.ok ? await bookingsRes.json() : { data: [] };

      setTickets(ticketsData.data || []);
      setVehicles(vehiclesData.data || []);
      setBookings(bookingsData.data || []);
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

  // ─── Form Helpers ─────────────────────────────────────────
  const resetForm = () => {
    setForm({
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

  // When a booking is selected, auto-fill vehicle and customer
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

  // ─── CRUD ─────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.violationDate) {
      setError("Violation date is required");
      return;
    }
    try {
      // Resolve customerId from booking
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
    }
  };

  const handleUpdate = async () => {
    if (!selectedTicket) return;
    try {
      let customerId = selectedTicket.customerId || "";
      if (form.bookingId) {
        const booking = bookings.find((b) => b.id === form.bookingId);
        if (booking) customerId = booking.customer_id ?? "";
      }

      const res = await adminFetch("/api/admin/tickets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTicket.id,
          ...form,
          customerId: customerId || null,
          amountDue: parseFloat(form.amountDue) || 0,
        }),
      });
      if (!res.ok) throw new Error("Failed to update ticket");
      setEditMode(false);
      setSelectedTicket(null);
      fetchData();
    } catch (err) {
      logger.error("Error updating ticket:", err);
      setError("Failed to update ticket");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await adminFetch(`/api/admin/tickets?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete ticket");
      setDeleteConfirm(null);
      setSelectedTicket(null);
      fetchData();
    } catch (err) {
      logger.error("Error deleting ticket:", err);
      setError("Failed to delete ticket");
    }
  };

  // Reset page when filters change
  useEffect(() => { resetPage(); }, [statusFilter, typeFilter]);

  // ─── Filtered Data ──────────────────────────────────────────
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

  // ─── Detail View ──────────────────────────────────────────
  if (selectedTicket && !editMode) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedTicket(null)} aria-label="Back to tickets list" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                Ticket {selectedTicket.prefix && selectedTicket.ticketNumber
                  ? `${selectedTicket.prefix}-${selectedTicket.ticketNumber}`
                  : selectedTicket.id.slice(0, 12)}
              </h1>
              <p className="text-sm text-gray-500">
                {selectedTicket.ticketType === "traffic" ? "Traffic Violation" : "Parking Violation"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  populateFormFromTicket(selectedTicket);
                  setEditMode(true);
                }}
              >
                <Pencil className="h-4 w-4 mr-1" /> Edit
              </Button>
              {deleteConfirm === selectedTicket.id ? (
                <div className="flex gap-1">
                  <Button size="sm" variant="danger" onClick={() => handleDelete(selectedTicket.id)}>
                    Confirm Delete
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => setDeleteConfirm(selectedTicket.id)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              )}
            </div>
          </div>

          {/* Status + Amount header */}
          <div className="bg-gradient-to-br from-gray-900 to-red-900 rounded-xl p-6 text-white">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-gray-300 text-xs font-medium uppercase tracking-wider">Amount Due</p>
                <p className="text-3xl font-bold mt-1">${selectedTicket.amountDue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-300 text-xs font-medium uppercase tracking-wider">Status</p>
                <Badge className={`mt-2 text-sm ${STATUS_COLORS[selectedTicket.status]}`}>
                  {selectedTicket.status.charAt(0).toUpperCase() + selectedTicket.status.slice(1)}
                </Badge>
              </div>
              <div>
                <p className="text-gray-300 text-xs font-medium uppercase tracking-wider">Type</p>
                <p className="text-lg font-bold mt-1 capitalize">{selectedTicket.ticketType}</p>
              </div>
              <div>
                <p className="text-gray-300 text-xs font-medium uppercase tracking-wider">Violation Date</p>
                <p className="text-lg font-bold mt-1">{formatDate(selectedTicket.violationDate)}</p>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="font-bold text-gray-900">Ticket Information</h3>
                <div className="space-y-3 text-sm">
                  {selectedTicket.state && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">State</span>
                      <span className="font-medium">{selectedTicket.state}</span>
                    </div>
                  )}
                  {selectedTicket.municipality && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Municipality</span>
                      <span className="font-medium">{selectedTicket.municipality}</span>
                    </div>
                  )}
                  {selectedTicket.courtId && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Court ID</span>
                      <span className="font-medium">{selectedTicket.courtId}</span>
                    </div>
                  )}
                  {selectedTicket.prefix && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Prefix</span>
                      <span className="font-medium">{selectedTicket.prefix}</span>
                    </div>
                  )}
                  {selectedTicket.ticketNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ticket Number</span>
                      <span className="font-medium font-mono">{selectedTicket.ticketNumber}</span>
                    </div>
                  )}
                  {selectedTicket.licensePlate && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">License Plate</span>
                      <span className="font-medium font-mono">{selectedTicket.licensePlate}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="font-bold text-gray-900">Linked Trip</h3>
                <div className="space-y-3 text-sm">
                  {selectedTicket.vehicleName && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Vehicle</span>
                      <span className="font-medium">{selectedTicket.vehicleName}</span>
                    </div>
                  )}
                  {selectedTicket.customerName && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Driver</span>
                      <span className="font-medium">{selectedTicket.customerName}</span>
                    </div>
                  )}
                  {selectedTicket.bookingDates && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Trip Dates</span>
                      <span className="font-medium">{selectedTicket.bookingDates}</span>
                    </div>
                  )}
                  {!selectedTicket.bookingId && (
                    <p className="text-gray-400 text-center py-4">No booking linked</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {selectedTicket.notes && (
            <Card>
              <CardContent className="p-5">
                <h3 className="font-bold text-gray-900 mb-2">Notes</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedTicket.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </PageContainer>
    );
  }

  // ─── Edit View ────────────────────────────────────────────
  if (selectedTicket && editMode) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => { setEditMode(false); setSelectedTicket(null); }} aria-label="Back to tickets list" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Edit Ticket</h1>
          </div>
          {renderForm(true)}
        </div>
      </PageContainer>
    );
  }

  // ─── Form Renderer ────────────────────────────────────────
  function renderForm(isEdit: boolean) {
    return (
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Type</label>
              <select
                value={form.ticketType}
                onChange={(e) => setForm((f) => ({ ...f, ticketType: e.target.value }))}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="traffic">Traffic</option>
                <option value="parking">Parking</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Violation Date *</label>
              <Input
                type="date"
                value={form.violationDate}
                onChange={(e) => setForm((f) => ({ ...f, violationDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Amount Due</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.amountDue}
                onChange={(e) => setForm((f) => ({ ...f, amountDue: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">State</label>
              <Input
                placeholder="NJ"
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Municipality</label>
              <Input
                placeholder="Jersey City"
                value={form.municipality}
                onChange={(e) => setForm((f) => ({ ...f, municipality: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Court ID</label>
              <Input
                placeholder="e.g. 0906"
                value={form.courtId}
                onChange={(e) => setForm((f) => ({ ...f, courtId: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Prefix</label>
              <Input
                placeholder="e.g. S"
                value={form.prefix}
                onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Ticket Number</label>
              <Input
                placeholder="e.g. 123456"
                value={form.ticketNumber}
                onChange={(e) => setForm((f) => ({ ...f, ticketNumber: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">License Plate</label>
              <Input
                placeholder="e.g. ABC-1234"
                value={form.licensePlate}
                onChange={(e) => setForm((f) => ({ ...f, licensePlate: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="disputed">Disputed</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Linked Booking</label>
              <select
                value={form.bookingId}
                onChange={(e) => handleBookingSelect(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">No booking</option>
                {bookings
                  .filter((b) => ["confirmed", "active", "completed"].includes(b.status))
                  .sort((a, b) => new Date(b.pickup_date).getTime() - new Date(a.pickup_date).getTime())
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.customer_name} — {b.vehicleName || "Vehicle"} ({b.pickup_date})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Vehicle</label>
              <select
                value={form.vehicleId}
                onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">Select vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.year} {v.make} {v.model}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Notes</label>
            <textarea
              rows={3}
              placeholder="Additional details..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={isEdit ? handleUpdate : handleCreate}>
              {isEdit ? "Save Changes" : "Add Ticket"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (isEdit) { setEditMode(false); setSelectedTicket(null); }
                else { setAdding(false); resetForm(); }
              }}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      </PageContainer>
    );
  }

  // ─── Main List View ───────────────────────────────────────
  return (
    <>
      <section className="bg-gradient-to-br from-gray-900 to-red-900 py-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Ticket className="h-8 w-8" />
              <div>
                <h1 className="text-3xl font-bold">Tickets</h1>
                <p className="text-gray-300 mt-1">Traffic &amp; parking violations linked to trips</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={fetchData}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10 bg-transparent"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                onClick={() => { resetForm(); setAdding(true); }}
                size="sm"
                className="bg-white text-gray-900 hover:bg-gray-100"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Ticket
              </Button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-2xl font-bold">{tickets.length}</p>
              <p className="text-xs text-gray-300">Total Tickets</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-2xl font-bold text-red-300">{statusCounts.unpaid}</p>
              <p className="text-xs text-gray-300">Unpaid</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-2xl font-bold">${totalUnpaid.toLocaleString()}</p>
              <p className="text-xs text-gray-300">Outstanding Amount</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-2xl font-bold">${totalAll.toLocaleString()}</p>
              <p className="text-xs text-gray-300">Total Amount</p>
            </div>
          </div>
        </div>
      </section>

      <PageContainer>
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

        {/* Add ticket form */}
        {adding && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">New Ticket</h2>
            {renderForm(false)}
          </div>
        )}

        {/* Filters */}
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

        {/* Ticket List */}
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
            </CardContent>
          </Card>
        ) : (
          <>
          <div className="space-y-2">
            {paginateArray(filtered).map((t) => (
              <Card
                key={t.id}
                className="cursor-pointer hover:shadow-md hover:border-purple-200 transition-all"
                onClick={() => setSelectedTicket(t)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Type icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      t.ticketType === "traffic" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                    }`}>
                      {t.ticketType === "traffic" ? <Car className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                    </div>

                    {/* Main info */}
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
                        {t.vehicleName && <span className="flex items-center gap-0.5"><Car className="h-3 w-3" />{t.vehicleName}</span>}
                        {t.customerName && <span>Driver: {t.customerName}</span>}
                        {t.licensePlate && <span className="font-mono">{t.licensePlate}</span>}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right shrink-0">
                      <p className={`text-lg font-bold ${t.status === "unpaid" ? "text-red-600" : t.status === "paid" ? "text-green-600" : "text-gray-600"}`}>
                        ${t.amountDue.toLocaleString()}
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
      </PageContainer>
    </>
  );
}
