"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw, Filter, Plus, X, Check, Upload, Shield, Pencil, Save, User, UserPlus, Mail, Ticket, MapPin, Car, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { Pagination, usePagination } from "@/components/ui/pagination";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { formatDate, formatTime } from "@/lib/utils/date-helpers";
import { statusColors } from "@/lib/utils/status-colors";
import { logger } from "@/lib/utils/logger";
import { exportToCSV } from "@/lib/utils/csv-export";

interface BookingRow {
  id: string;
  customer_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  vehicleName: string;
  vehicle_id: string;
  pickup_date: string;
  return_date: string;
  pickup_time?: string;
  return_time?: string;
  total_price: number;
  deposit: number;
  status: string;
  created_at: string;
  id_document_url?: string;
  insurance_proof_url?: string;
  insurance_opted_out?: boolean;
  signed_name?: string;
  agreement_signed_at?: string;
  rental_agreement_url?: string;
  extras?: ExtraItem[];
}

interface ExtraItem {
  id: string;
  name: string;
  pricePerDay: number;
  maxPrice: number | null;
  billingType: "per-day" | "per-day-capped" | "one-time";
  description: string;
  selected?: boolean;
}

interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  dailyRate: number;
  isAvailable: boolean;
}

// Pre-generate time slot options (8:00 AM – 4:00 AM, 30-min intervals)
const TIME_SLOTS = Array.from({ length: 41 }, (_, i) => {
  const hour = 8 + Math.floor(i / 2);
  const minute = i % 2 === 0 ? 0 : 30;
  const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return { value, label: formatTime(value) };
});

const AVAILABLE_EXTRAS = [
  { id: "e1", name: "Insurance Coverage", pricePerDay: 11.25, maxPrice: null, billingType: "per-day" as const, description: "Basic collision damage waiver" },
  { id: "e2", name: "Child Seat", pricePerDay: 10, maxPrice: 50, billingType: "per-day-capped" as const, description: "Infant and toddler car seat" },
  { id: "e3", name: "Roadside Assistance", pricePerDay: 8, maxPrice: null, billingType: "per-day" as const, description: "24/7 emergency roadside assistance" },
  { id: "e4", name: "Fuel Pre-Pay", pricePerDay: 45, maxPrice: null, billingType: "one-time" as const, description: "Pre-pay for a full tank" },
];

const emptyNewBooking = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  vehicleId: "",
  pickupDate: "",
  returnDate: "",
  pickupTime: "10:00",
  returnTime: "10:00",
  totalPrice: 0,
  status: "confirmed" as string,
  selectedExtras: ["e1"] as string[], // Insurance selected by default
};

export default function AdminBookingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full" />
      </div>
    }>
      <AdminBookingsContent />
    </Suspense>
  );
}

interface CustomerOption {
  id: string;
  name: string;
  email: string;
  phone: string;
}

function AdminBookingsContent() {
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBooking, setNewBooking] = useState(emptyNewBooking);
  const [creating, setCreating] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<BookingRow>>({});
  const [saving, setSaving] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [prefillApplied, setPrefillApplied] = useState(false);
  const { currentPage, pageSize, handlePageChange, handlePageSizeChange, resetPage, paginateArray } = usePagination(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [allCustomers, setAllCustomers] = useState<CustomerOption[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [bookingTickets, setBookingTickets] = useState<Array<{ id: string; ticketType: string; violationDate: string; municipality: string; state: string; prefix: string; ticketNumber: string; amountDue: number; status: string; licensePlate: string }>>([]);
  const customerDropdownRef = React.useRef<HTMLDivElement>(null);

  // Auto-open create form with prefilled customer data from URL params
  // (e.g. navigated from customer panel "Create Booking" button)
  useEffect(() => {
    if (prefillApplied) return;
    const customerName = searchParams.get("customerName");
    const customerEmail = searchParams.get("customerEmail");
    if (customerName || customerEmail) {
      setNewBooking((prev) => ({
        ...prev,
        customerName: customerName || prev.customerName,
        customerEmail: customerEmail || prev.customerEmail,
        customerPhone: searchParams.get("customerPhone") || prev.customerPhone,
      }));
      setShowCreateForm(true);
      setPrefillApplied(true);
    }
  }, [searchParams, prefillApplied]);

  // Close customer dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };

    if (showCustomerDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showCustomerDropdown]);

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const url = statusFilter === "all" ? "/api/bookings" : `/api/bookings?status=${statusFilter}`;
      const res = await adminFetch(url);
      if (!res.ok) throw new Error(`Failed to fetch bookings: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        // Hide cancelled bookings unless specifically filtering for them
        const results = data.data || [];
        if (statusFilter === "all") {
          setBookings(results.filter((b: BookingRow) => b.status !== "cancelled"));
        } else {
          setBookings(results);
        }
      }
    } catch (err) {
      logger.error("Failed to fetch bookings:", err);
    }
    setLoading(false);
  };

  const handleExportBookingsCSV = () => {
    const exportData = bookings.map((booking) => ({
      "Booking ID": booking.id,
      "Customer Name": booking.customer_name,
      Email: booking.customer_email,
      Vehicle: booking.vehicleName,
      "Pickup Date": formatDate(booking.pickup_date),
      "Return Date": formatDate(booking.return_date),
      Status: booking.status,
      "Total Amount": `$${booking.total_price}`,
      "Created Date": formatDate(booking.created_at),
    }));
    exportToCSV(exportData, `bookings-export-${new Date().toISOString().split("T")[0]}`);
  };

  const fetchVehicles = async () => {
    try {
      const res = await adminFetch("/api/admin/vehicles");
      const data = await res.json();
      if (data.success) setVehicles(data.data || []);
    } catch (err) {
      logger.error("Failed to fetch vehicles:", err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await adminFetch("/api/admin/customers");
      const data = await res.json();
      if (data.success) {
        const customerOptions: CustomerOption[] = (data.data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone || "",
        }));
        setAllCustomers(customerOptions);
      }
    } catch (err) {
      logger.error("Failed to fetch customers:", err);
    }
  };

  useEffect(() => {
    fetchBookings();
    resetPage();
  }, [statusFilter]);

  useEffect(() => {
    fetchVehicles();
    fetchCustomers();
  }, []);

  const updateStatus = async (bookingId: string, newStatus: string) => {
    setUpdating(bookingId);
    try {
      const res = await adminFetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, status: newStatus }),
      });
      if (!res.ok) throw new Error(`Failed to update booking: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        if (newStatus === "cancelled") {
          setBookings((prev) => prev.filter((b) => b.id !== bookingId));
        } else {
          setBookings((prev) =>
            prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
          );
        }
        setSuccess(`Booking ${newStatus} successfully!`);
      } else {
        setError(data.message || `Failed to update booking to "${newStatus}"`);
      }
    } catch {
      setError("Network error — could not update booking status");
    }
    setUpdating(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const currentPageIds = paginateArray(bookings).map((b) => b.id);
    const allSelected = currentPageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      currentPageIds.forEach((id) => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    let successCount = 0;
    for (const id of selectedIds) {
      try {
        const res = await adminFetch("/api/bookings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: id, status: newStatus }),
        });
        const data = await res.json();
        if (data.success) successCount++;
      } catch { /* continue with others */ }
    }
    if (successCount > 0) {
      setSuccess(`${successCount} booking${successCount > 1 ? "s" : ""} updated to ${newStatus}`);
      fetchBookings();
    }
    setSelectedIds(new Set());
    setBulkUpdating(false);
  };

  // Calculate price when vehicle, dates, or extras change
  useEffect(() => {
    if (newBooking.vehicleId && newBooking.pickupDate && newBooking.returnDate) {
      const vehicle = vehicles.find((v) => v.id === newBooking.vehicleId);
      if (vehicle) {
        const start = new Date(newBooking.pickupDate);
        const end = new Date(newBooking.returnDate);
        const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        const baseTotal = days * vehicle.dailyRate;

        // Add extras cost
        let extrasTotal = 0;
        for (const extraId of newBooking.selectedExtras) {
          const extra = AVAILABLE_EXTRAS.find((e) => e.id === extraId);
          if (extra) {
            if (extra.billingType === "one-time") {
              extrasTotal += extra.pricePerDay;
            } else if (extra.billingType === "per-day-capped" && extra.maxPrice) {
              extrasTotal += Math.min(days * extra.pricePerDay, extra.maxPrice);
            } else {
              extrasTotal += days * extra.pricePerDay;
            }
          }
        }

        const subtotal = baseTotal + extrasTotal;
        const tax = subtotal * 0.08; // 8% tax
        const total = subtotal + tax;
        setNewBooking((prev) => ({ ...prev, totalPrice: parseFloat(total.toFixed(2)) }));
      }
    }
  }, [newBooking.vehicleId, newBooking.pickupDate, newBooking.returnDate, newBooking.selectedExtras, vehicles]);

  const handleCreateBooking = async () => {
    if (!newBooking.customerName || !newBooking.customerEmail || !newBooking.vehicleId || !newBooking.pickupDate || !newBooking.returnDate) {
      setError("Please fill in customer name, email, vehicle, and dates.");
      return;
    }

    setCreating(true);
    try {
      // Build selected extras array for the booking
      const selectedExtrasData = newBooking.selectedExtras
        .map((id) => AVAILABLE_EXTRAS.find((e) => e.id === id))
        .filter(Boolean)
        .map((e) => ({ ...e, selected: true }));

      const hasInsurance = newBooking.selectedExtras.includes("e1");

      const res = await adminFetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: newBooking.vehicleId,
          customerDetails: {
            name: newBooking.customerName,
            email: newBooking.customerEmail || null,
            phone: newBooking.customerPhone || null,
          },
          pickupDate: newBooking.pickupDate,
          returnDate: newBooking.returnDate,
          pickupTime: newBooking.pickupTime,
          returnTime: newBooking.returnTime,
          totalPrice: newBooking.totalPrice,
          extras: selectedExtrasData,
          insuranceOptedOut: !hasInsurance,
          adminCreated: true,
          initialStatus: newBooking.status || "pending",
        }),
      });

      if (!res.ok) throw new Error(`Failed to create booking: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setShowCreateForm(false);
        setNewBooking(emptyNewBooking);
        fetchBookings();
        setSuccess("Booking created successfully!");
      } else {
        setError(data.message || "Failed to create booking");
      }
    } catch {
      setError("Network error — could not create booking");
    }
    setCreating(false);
  };

  const handleDocumentUpload = async (docType: "id_document" | "insurance_proof", file: File) => {
    if (!selectedBooking) return;

    setUploadingDoc(docType);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bookingId", selectedBooking.id);
      formData.append("type", docType);

      const res = await adminFetch("/api/bookings/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Failed to upload document: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        // Update selected booking with new URL
        const columnName = docType === "id_document" ? "id_document_url" : "insurance_proof_url";
        setSelectedBooking((prev) =>
          prev ? { ...prev, [columnName]: data.url } : null
        );

        // Also update in bookings list
        setBookings((prev) =>
          prev.map((b) =>
            b.id === selectedBooking.id
              ? { ...b, [columnName]: data.url }
              : b
          )
        );

        setError(null);
      } else {
        setError(data.error || "Failed to upload document");
      }
    } catch (err) {
      logger.error("Upload error:", err);
      setError("Network error — could not upload document");
    }
    setUploadingDoc(null);
  };

  const handleAddAsCustomer = async () => {
    if (!selectedBooking) return;
    setAddingCustomer(true);
    try {
      const res = await adminFetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedBooking.customer_name,
          email: selectedBooking.customer_email,
          phone: selectedBooking.customer_phone || "",
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.id) {
        // Update the booking with the new customer_id
        await adminFetch("/api/bookings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: selectedBooking.id, customer_id: data.data.id }),
        });
        // Update local state
        const updated = { ...selectedBooking, customer_id: data.data.id };
        setSelectedBooking(updated);
        setBookings((prev) => prev.map((b) => (b.id === selectedBooking.id ? updated : b)));
      } else {
        setError(data.message || "Failed to add customer");
      }
    } catch {
      setError("Network error — could not add customer");
    }
    setAddingCustomer(false);
  };

  const handleSendBookingEmail = async () => {
    if (!selectedBooking) return;
    if (!selectedBooking.customer_email) {
      setError("Cannot send email — no customer email on this booking.");
      return;
    }
    setSendingEmail(true);
    try {
      const res = await adminFetch("/api/admin/send-booking-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: selectedBooking.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to send email");
      setError(null);
      alert(`Booking email sent to ${selectedBooking.customer_email}`);
    } catch (err) {
      logger.error("Failed to send booking email:", err);
      setError(err instanceof Error ? err.message : "Failed to send booking email");
    }
    setSendingEmail(false);
  };

  const startEditing = () => {
    if (!selectedBooking) return;
    setEditData({
      customer_name: selectedBooking.customer_name,
      customer_email: selectedBooking.customer_email,
      customer_phone: selectedBooking.customer_phone || "",
      vehicle_id: selectedBooking.vehicle_id,
      pickup_date: selectedBooking.pickup_date,
      return_date: selectedBooking.return_date,
      pickup_time: selectedBooking.pickup_time || "10:00",
      return_time: selectedBooking.return_time || "10:00",
      total_price: selectedBooking.total_price,
      deposit: selectedBooking.deposit,
    });
    setEditMode(true);
  };

  const cancelEditing = () => {
    setEditMode(false);
    setEditData({});
  };

  const handleSaveEdit = async () => {
    if (!selectedBooking) return;

    // Basic validation
    if (!editData.customer_name || !editData.customer_email || !editData.vehicle_id || !editData.pickup_date || !editData.return_date) {
      setError("Please fill in customer name, email, vehicle, and dates.");
      return;
    }

    setSaving(true);
    try {
      const res = await adminFetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          customer_name: editData.customer_name,
          customer_email: editData.customer_email,
          customer_phone: editData.customer_phone,
          vehicle_id: editData.vehicle_id,
          pickup_date: editData.pickup_date,
          return_date: editData.return_date,
          pickup_time: editData.pickup_time,
          return_time: editData.return_time,
          total_price: editData.total_price,
          deposit: editData.deposit,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Find vehicle name for the updated booking
        const vehicle = vehicles.find((v) => v.id === editData.vehicle_id);
        const vehicleName = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : selectedBooking.vehicleName;

        const updatedBooking: BookingRow = {
          ...selectedBooking,
          customer_name: editData.customer_name || selectedBooking.customer_name,
          customer_email: editData.customer_email || selectedBooking.customer_email,
          customer_phone: editData.customer_phone || selectedBooking.customer_phone,
          vehicle_id: editData.vehicle_id || selectedBooking.vehicle_id,
          vehicleName,
          pickup_date: editData.pickup_date || selectedBooking.pickup_date,
          return_date: editData.return_date || selectedBooking.return_date,
          pickup_time: editData.pickup_time || selectedBooking.pickup_time,
          return_time: editData.return_time || selectedBooking.return_time,
          total_price: editData.total_price ?? selectedBooking.total_price,
          deposit: editData.deposit ?? selectedBooking.deposit,
        };

        setSelectedBooking(updatedBooking);
        setBookings((prev) =>
          prev.map((b) => (b.id === selectedBooking.id ? updatedBooking : b))
        );
        setEditMode(false);
        setEditData({});
      } else {
        setError(data.message || "Failed to update booking");
      }
    } catch {
      setError("Network error — could not update booking");
    }
    setSaving(false);
  };

  // Auto-recalculate price when vehicle or dates change in edit mode
  useEffect(() => {
    if (!editMode || !editData.vehicle_id || !editData.pickup_date || !editData.return_date) return;
    const vehicle = vehicles.find((v) => v.id === editData.vehicle_id);
    if (!vehicle) return;

    const start = new Date(editData.pickup_date);
    const end = new Date(editData.return_date);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    // Calculate base + extras (use selected booking's extras if available)
    const baseTotal = days * vehicle.dailyRate;
    let extrasTotal = 0;
    if (selectedBooking?.extras && selectedBooking.extras.length > 0) {
      for (const extra of selectedBooking.extras) {
        if (extra.billingType === "one-time") {
          extrasTotal += extra.pricePerDay;
        } else if (extra.billingType === "per-day-capped" && extra.maxPrice) {
          extrasTotal += Math.min(days * extra.pricePerDay, extra.maxPrice);
        } else {
          extrasTotal += days * (extra.pricePerDay ?? 0);
        }
      }
    }

    const subtotal = baseTotal + extrasTotal;
    const tax = subtotal * 0.08;
    const total = parseFloat((subtotal + tax).toFixed(2));
    setEditData((prev) => ({ ...prev, total_price: total }));
  }, [editMode, editData.vehicle_id, editData.pickup_date, editData.return_date, vehicles, selectedBooking]);

  // Fetch tickets for the selected booking
  useEffect(() => {
    if (!selectedBooking?.id || !showDetail) {
      setBookingTickets([]);
      return;
    }
    adminFetch(`/api/admin/tickets?booking_id=${selectedBooking.id}`)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setBookingTickets(d.data || []))
      .catch(() => setBookingTickets([]));
  }, [selectedBooking?.id, showDetail]);

  return (
    <>
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
        {/* Error Banner */}
        {success && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 flex items-center justify-between">
            <span className="flex items-center gap-2"><Check className="h-4 w-4" />{success}</span>
            <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600 ml-3">&times;</button>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-3">&times;</button>
          </div>
        )}

        {/* Filters + Create Button */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            {["all", "pending", "confirmed", "active", "completed", "cancelled"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchBookings} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportBookingsCSV}>
              <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> New Booking
            </Button>
          </div>
        </div>

        {/* Create Booking Form */}
        {showCreateForm && (
          <Card className="mb-6 border-purple-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Create Booking (Direct Client)</h3>
                <button onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Select Existing Customer Dropdown */}
                <div className="lg:col-span-3" ref={customerDropdownRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Existing Customer</label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      placeholder="Search by name or email..."
                      className="w-full"
                    />
                    {showCustomerDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-64 overflow-y-auto">
                        {allCustomers
                          .filter(
                            (c) =>
                              c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                              c.email.toLowerCase().includes(customerSearch.toLowerCase())
                          )
                          .slice(0, 8)
                          .map((customer) => (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={() => {
                                setNewBooking((prev) => ({
                                  ...prev,
                                  customerName: customer.name,
                                  customerEmail: customer.email,
                                  customerPhone: customer.phone,
                                }));
                                setCustomerSearch("");
                                setShowCustomerDropdown(false);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-purple-50 border-b border-gray-100 last:border-b-0 transition-colors"
                            >
                              <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                              <div className="text-xs text-gray-500">{customer.email}</div>
                            </button>
                          ))}
                        {allCustomers.filter(
                          (c) =>
                            c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                            c.email.toLowerCase().includes(customerSearch.toLowerCase())
                        ).length === 0 && (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">No customers found</div>
                        )}
                      </div>
                    )}
                  </div>
                  {customerSearch === "" && !showCustomerDropdown && newBooking.customerName === "" && (
                    <p className="text-xs text-gray-400 mt-2">Start typing to find an existing customer, or enter details below</p>
                  )}
                </div>

                {/* Divider */}
                <div className="lg:col-span-3">
                  <div className="flex items-center gap-3 my-2">
                    <div className="flex-1 border-t border-gray-200" />
                    <span className="text-xs text-gray-400 font-medium">Or enter new customer details below</span>
                    <div className="flex-1 border-t border-gray-200" />
                  </div>
                </div>

                {/* Customer Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                  <Input
                    value={newBooking.customerName}
                    onChange={(e) => setNewBooking((prev) => ({ ...prev, customerName: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <Input
                    type="email"
                    value={newBooking.customerEmail}
                    onChange={(e) => setNewBooking((prev) => ({ ...prev, customerEmail: e.target.value }))}
                    placeholder="john@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <Input
                    value={newBooking.customerPhone}
                    onChange={(e) => setNewBooking((prev) => ({ ...prev, customerPhone: e.target.value }))}
                    placeholder="(555) 123-4567 (optional)"
                  />
                </div>

                {/* Vehicle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle *</label>
                  <select
                    value={newBooking.vehicleId}
                    onChange={(e) => setNewBooking((prev) => ({ ...prev, vehicleId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select vehicle...</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.year} {v.make} {v.model} — ${v.dailyRate}/day
                        {!v.isAvailable ? " (Unavailable)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dates and Times */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Date *</label>
                  <Input
                    type="date"
                    value={newBooking.pickupDate}
                    onChange={(e) => setNewBooking((prev) => ({ ...prev, pickupDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Time *</label>
                  <select
                    value={newBooking.pickupTime}
                    onChange={(e) => setNewBooking((prev) => ({ ...prev, pickupTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {TIME_SLOTS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Return Date *</label>
                  <Input
                    type="date"
                    value={newBooking.returnDate}
                    onChange={(e) => setNewBooking((prev) => ({ ...prev, returnDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Return Time *</label>
                  <select
                    value={newBooking.returnTime}
                    onChange={(e) => setNewBooking((prev) => ({ ...prev, returnTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {TIME_SLOTS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Extras / Insurance */}
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Shield className="inline h-4 w-4 mr-1 text-purple-600" />
                    Add-Ons & Insurance
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {AVAILABLE_EXTRAS.map((extra) => {
                      const isSelected = newBooking.selectedExtras.includes(extra.id);
                      return (
                        <button
                          key={extra.id}
                          type="button"
                          onClick={() => {
                            setNewBooking((prev) => ({
                              ...prev,
                              selectedExtras: isSelected
                                ? prev.selectedExtras.filter((id) => id !== extra.id)
                                : [...prev.selectedExtras, extra.id],
                            }));
                          }}
                          className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                            isSelected
                              ? "border-purple-500 bg-purple-50 ring-1 ring-purple-500"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <div className={`flex h-5 w-5 items-center justify-center rounded border-2 shrink-0 ${
                            isSelected ? "border-purple-600 bg-purple-600" : "border-gray-300"
                          }`}>
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{extra.name}</span>
                              {extra.id === "e1" && (
                                <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">Recommended</span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">{extra.description}</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-700 shrink-0">
                            ${extra.pricePerDay}{extra.billingType === "one-time" ? "" : "/day"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Price + Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Price ($)</label>
                  <Input
                    type="number"
                    value={newBooking.totalPrice}
                    onChange={(e) => setNewBooking((prev) => ({ ...prev, totalPrice: parseFloat(e.target.value) || 0 }))}
                    min={0}
                    step={0.01}
                  />
                  <p className="text-xs text-gray-400 mt-1">Auto-calculated from daily rate, editable for custom pricing</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial Status</label>
                  <select
                    value={newBooking.status}
                    onChange={(e) => setNewBooking((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="confirmed">Confirmed (paid outside site)</option>
                    <option value="pending">Pending (awaiting payment)</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setShowCreateForm(false); setNewBooking(emptyNewBooking); }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateBooking}
                  disabled={creating}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {creating ? (
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  {creating ? "Creating..." : "Create Booking"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
            {statusFilter === "all" && <span className="text-gray-400"> (cancelled trips hidden)</span>}
          </p>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5">
              <span className="text-sm font-medium text-purple-700">{selectedIds.size} selected</span>
              <Button size="sm" variant="outline" className="h-7 text-xs text-green-600 hover:text-green-700" onClick={() => bulkUpdateStatus("confirmed")} disabled={bulkUpdating}>
                Confirm
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => bulkUpdateStatus("active")} disabled={bulkUpdating}>
                Start
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => bulkUpdateStatus("completed")} disabled={bulkUpdating}>
                Complete
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 hover:text-red-700" onClick={() => bulkUpdateStatus("cancelled")} disabled={bulkUpdating}>
                Cancel
              </Button>
              <button className="text-purple-400 hover:text-purple-600 ml-1" onClick={() => setSelectedIds(new Set())}><X className="h-4 w-4" /></button>
            </div>
          )}
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={paginateArray(bookings).length > 0 && paginateArray(bookings).every((b) => selectedIds.has(b.id))}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Vehicle</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Dates</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Total</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Paid</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      Loading...
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      No bookings found.
                    </td>
                  </tr>
                ) : (
                  paginateArray(bookings).map((b) => (
                    <tr key={b.id} className={`border-b last:border-0 hover:bg-gray-50 cursor-pointer ${selectedIds.has(b.id) ? "bg-purple-50" : ""}`} onClick={() => { setSelectedBooking(b); setShowDetail(true); }}>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          checked={selectedIds.has(b.id)}
                          onChange={() => toggleSelect(b.id)}
                        />
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <div className="text-gray-900 truncate">{b.customer_name || "—"}</div>
                        <div className="text-xs text-gray-400 truncate">{b.customer_email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{b.vehicleName}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-bold text-gray-900">{formatDate(b.pickup_date)}</div>
                        <div className="text-lg font-bold text-purple-600">{formatTime(b.pickup_time)}</div>
                        <div className="text-sm font-bold text-gray-900 mt-1">→ {formatDate(b.return_date)}</div>
                        <div className="text-lg font-bold text-purple-600">{formatTime(b.return_time)}</div>
                      </td>
                      <td className="px-4 py-3 font-medium">${(b.total_price ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-green-600">${(b.deposit ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <Badge className={statusColors[b.status] || "bg-gray-100"}>{b.status}</Badge>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          {b.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 text-green-600 hover:text-green-700"
                              onClick={() => updateStatus(b.id, "confirmed")}
                              disabled={updating === b.id}
                            >
                              Confirm
                            </Button>
                          )}
                          {b.status === "confirmed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => updateStatus(b.id, "active")}
                              disabled={updating === b.id}
                            >
                              Start
                            </Button>
                          )}
                          {b.status === "active" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => updateStatus(b.id, "completed")}
                              disabled={updating === b.id}
                            >
                              Complete
                            </Button>
                          )}
                          {["pending", "confirmed"].includes(b.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 text-red-600 hover:text-red-700"
                              onClick={() => updateStatus(b.id, "cancelled")}
                              disabled={updating === b.id}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={bookings.length}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </Card>
      </PageContainer>

      {/* Booking Detail Panel */}
      {showDetail && selectedBooking && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/50" onClick={() => { setShowDetail(false); cancelEditing(); }} />
          {/* Panel */}
          <div className="w-full max-w-lg bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold">{editMode ? "Edit Booking" : "Booking Details"}</h2>
              <div className="flex items-center gap-2">
                {!editMode && (
                  <button
                    onClick={handleSendBookingEmail}
                    disabled={sendingEmail}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                    title="Send booking details & sign agreement link to customer"
                  >
                    {sendingEmail ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                    {sendingEmail ? "Sending..." : "Send Email"}
                  </button>
                )}
                {!editMode && !["completed", "cancelled"].includes(selectedBooking.status) && (
                  <button
                    onClick={startEditing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                )}
                <button onClick={() => { setShowDetail(false); cancelEditing(); }} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Booking ID & Status */}
              <div>
                <p className="text-xs text-gray-500">Booking ID</p>
                <p className="font-mono text-purple-600 font-bold break-all">{selectedBooking.id}</p>
                <Badge className={statusColors[selectedBooking.status] || "bg-gray-100"}>
                  {selectedBooking.status}
                </Badge>
              </div>

              {/* Customer Info */}
              <div>
                <h3 className="font-semibold text-sm text-gray-500 uppercase mb-2">Customer</h3>
                {editMode ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                      <Input
                        value={editData.customer_name || ""}
                        onChange={(e) => setEditData((prev) => ({ ...prev, customer_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                      <Input
                        type="email"
                        value={editData.customer_email || ""}
                        onChange={(e) => setEditData((prev) => ({ ...prev, customer_email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                      <Input
                        value={editData.customer_phone || ""}
                        onChange={(e) => setEditData((prev) => ({ ...prev, customer_phone: e.target.value }))}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-medium">{selectedBooking.customer_name}</p>
                    <p className="text-sm text-gray-500">{selectedBooking.customer_email}</p>
                    <p className="text-sm text-gray-500">{selectedBooking.customer_phone}</p>
                    <div className="flex gap-2 mt-3">
                      {selectedBooking.customer_id ? (
                        <Link
                          href={`/admin/customers?highlight=${selectedBooking.customer_id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                        >
                          <User className="h-3.5 w-3.5" /> View Client
                        </Link>
                      ) : (
                        <button
                          onClick={handleAddAsCustomer}
                          disabled={addingCustomer}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          {addingCustomer ? "Adding..." : "Add as Customer"}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* ID Document Upload */}
              <div>
                <h3 className="font-semibold text-sm text-gray-500 uppercase mb-2">ID Document</h3>
                {selectedBooking.id_document_url ? (
                  <a
                    href={selectedBooking.id_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={selectedBooking.id_document_url}
                      alt="Customer ID"
                      loading="lazy"
                      className="rounded-lg border max-h-48 object-contain"
                    />
                    <p className="text-xs text-purple-600 mt-1">Click to view full size</p>
                  </a>
                ) : (
                  <p className="text-sm text-gray-400 italic mb-2">No ID document uploaded</p>
                )}
                <label className="block">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleDocumentUpload("id_document", e.target.files[0]);
                      }
                    }}
                    disabled={uploadingDoc === "id_document"}
                    className="hidden"
                  />
                  <span className="inline-flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-200 cursor-pointer transition-colors">
                    <Upload className="h-4 w-4" />
                    {uploadingDoc === "id_document" ? "Uploading..." : "Upload ID"}
                  </span>
                </label>
              </div>

              {/* Vehicle */}
              <div>
                <h3 className="font-semibold text-sm text-gray-500 uppercase mb-2">Vehicle</h3>
                {editMode ? (
                  <select
                    value={editData.vehicle_id || ""}
                    onChange={(e) => setEditData((prev) => ({ ...prev, vehicle_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select vehicle...</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.year} {v.make} {v.model} — ${v.dailyRate}/day
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="font-medium">{selectedBooking.vehicleName || selectedBooking.vehicle_id}</p>
                )}
              </div>

              {/* Dates and Times */}
              <div className="grid grid-cols-2 gap-4">
                {editMode ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Pickup Date *</label>
                      <Input
                        type="date"
                        value={editData.pickup_date || ""}
                        onChange={(e) => setEditData((prev) => ({ ...prev, pickup_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Pickup Time</label>
                      <select
                        value={editData.pickup_time || "10:00"}
                        onChange={(e) => setEditData((prev) => ({ ...prev, pickup_time: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {TIME_SLOTS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Return Date *</label>
                      <Input
                        type="date"
                        value={editData.return_date || ""}
                        onChange={(e) => setEditData((prev) => ({ ...prev, return_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Return Time</label>
                      <select
                        value={editData.return_time || "10:00"}
                        onChange={(e) => setEditData((prev) => ({ ...prev, return_time: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {TIME_SLOTS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-gray-500">Pickup Date</p>
                      <p className="text-lg font-bold text-gray-900">{formatDate(selectedBooking.pickup_date)}</p>
                      <p className="text-xs text-gray-500 mt-1">Time</p>
                      <p className="text-xl font-bold text-purple-600">{formatTime(selectedBooking.pickup_time)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Return Date</p>
                      <p className="text-lg font-bold text-gray-900">{formatDate(selectedBooking.return_date)}</p>
                      <p className="text-xs text-gray-500 mt-1">Time</p>
                      <p className="text-xl font-bold text-purple-600">{formatTime(selectedBooking.return_time)}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Extras */}
              {selectedBooking.extras && selectedBooking.extras.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-gray-500 uppercase mb-2">Extras</h3>
                  <ul className="space-y-1">
                    {selectedBooking.extras.map((e: ExtraItem, i: number) => (
                      <li key={i} className="flex justify-between text-sm">
                        <span>{e.name}</span>
                        <span className="text-gray-500">${e.pricePerDay}/day</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Insurance Status */}
              <div>
                <h3 className="font-semibold text-sm text-gray-500 uppercase mb-2">Insurance</h3>
                {selectedBooking.insurance_opted_out ? (
                  <div>
                    <Badge className="bg-yellow-100 text-yellow-700">Opted Out (Own Coverage)</Badge>
                    {selectedBooking.insurance_proof_url && (
                      <a
                        href={selectedBooking.insurance_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-2"
                      >
                        <img
                          src={selectedBooking.insurance_proof_url}
                          alt="Insurance Proof"
                          loading="lazy"
                          className="rounded-lg border max-h-48 object-contain"
                        />
                        <p className="text-xs text-purple-600 mt-1">Click to view full size</p>
                      </a>
                    )}
                    {!selectedBooking.insurance_proof_url && (
                      <label className="block mt-2">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleDocumentUpload("insurance_proof", e.target.files[0]);
                            }
                          }}
                          disabled={uploadingDoc === "insurance_proof"}
                          className="hidden"
                        />
                        <span className="inline-flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-200 cursor-pointer transition-colors">
                          <Upload className="h-4 w-4" />
                          {uploadingDoc === "insurance_proof" ? "Uploading..." : "Upload Proof"}
                        </span>
                      </label>
                    )}
                  </div>
                ) : (
                  <Badge className="bg-green-100 text-green-700">NextGearAuto Insurance Included</Badge>
                )}
              </div>

              {/* Pricing */}
              <div>
                <h3 className="font-semibold text-sm text-gray-500 uppercase mb-2">Payment</h3>
                {editMode ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Total Price ($)</label>
                      <Input
                        type="number"
                        value={editData.total_price ?? 0}
                        onChange={(e) => setEditData((prev) => ({ ...prev, total_price: parseFloat(e.target.value) || 0 }))}
                        min={0}
                        step={0.01}
                      />
                      <p className="text-xs text-gray-400 mt-1">Auto-calculated when vehicle or dates change, editable for custom pricing</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Amount Paid ($)</label>
                      <Input
                        type="number"
                        value={editData.deposit ?? 0}
                        onChange={(e) => setEditData((prev) => ({ ...prev, deposit: parseFloat(e.target.value) || 0 }))}
                        min={0}
                        step={0.01}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-500">Total</span>
                      <span className="font-bold text-lg">${(selectedBooking.total_price ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-500">Paid</span>
                      <span className="text-green-600 font-semibold">${(selectedBooking.deposit ?? 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Agreement */}
              {selectedBooking.signed_name || selectedBooking.rental_agreement_url ? (
                <div>
                  <h3 className="font-semibold text-sm text-gray-500 uppercase mb-2">Agreement</h3>
                  {selectedBooking.signed_name && (
                    <p className="font-serif italic">{selectedBooking.signed_name}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {selectedBooking.agreement_signed_at
                      ? new Date(selectedBooking.agreement_signed_at).toLocaleString()
                      : ""}
                  </p>
                  {selectedBooking.rental_agreement_url && (
                    <a
                      href={selectedBooking.rental_agreement_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 font-medium"
                    >
                      View Signed Agreement &rarr;
                    </a>
                  )}
                </div>
              ) : (
                <div>
                  <h3 className="font-semibold text-sm text-gray-500 uppercase mb-2">Agreement</h3>
                  <p className="text-xs text-gray-400">Not yet signed</p>
                </div>
              )}

              {/* Tickets for this booking */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm text-gray-500 uppercase">
                    Tickets ({bookingTickets.length})
                  </h3>
                  <Link
                    href={`/admin/tickets`}
                    className="text-xs text-purple-600 hover:text-purple-800"
                  >
                    View All &rarr;
                  </Link>
                </div>
                {bookingTickets.length === 0 ? (
                  <p className="text-xs text-gray-400">No tickets for this trip</p>
                ) : (
                  <div className="space-y-2">
                    {bookingTickets.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-100"
                      >
                        <Ticket className="h-4 w-4 text-red-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">
                            {t.prefix && t.ticketNumber ? `${t.prefix}-${t.ticketNumber}` : t.ticketType}
                          </p>
                          <p className="text-xs text-gray-500">
                            {t.municipality}{t.state ? `, ${t.state}` : ""} · {formatDate(t.violationDate)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-red-600">${t.amountDue}</p>
                          <Badge variant="secondary" className="text-[10px] capitalize">{t.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Edit Mode Save/Cancel Buttons */}
              {editMode && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={cancelEditing}
                    className="flex-1"
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {saving ? (
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
