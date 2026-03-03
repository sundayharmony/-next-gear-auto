"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Filter, Plus, X, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";

interface BookingRow {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  vehicleName: string;
  vehicle_id: string;
  pickup_date: string;
  return_date: string;
  total_price: number;
  deposit: number;
  status: string;
  created_at: string;
}

interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  dailyRate: number;
  isAvailable: boolean;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  active: "bg-blue-100 text-blue-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
  "no-show": "bg-orange-100 text-orange-700",
};

const emptyNewBooking = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  vehicleId: "",
  pickupDate: "",
  returnDate: "",
  totalPrice: 0,
  status: "confirmed" as string,
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBooking, setNewBooking] = useState(emptyNewBooking);
  const [creating, setCreating] = useState(false);

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const url = statusFilter === "all" ? "/api/bookings" : `/api/bookings?status=${statusFilter}`;
      const res = await fetch(url);
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
      console.error("Failed to fetch bookings:", err);
    }
    setLoading(false);
  };

  const fetchVehicles = async () => {
    try {
      const res = await fetch("/api/admin/vehicles");
      const data = await res.json();
      if (data.success) setVehicles(data.data || []);
    } catch (err) {
      console.error("Failed to fetch vehicles:", err);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const updateStatus = async (bookingId: string, newStatus: string) => {
    setUpdating(bookingId);
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        if (newStatus === "cancelled") {
          // Remove from view immediately
          setBookings((prev) => prev.filter((b) => b.id !== bookingId));
        } else {
          setBookings((prev) =>
            prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
          );
        }
      } else {
        setError(data.message || `Failed to update booking to "${newStatus}"`);
      }
    } catch {
      setError("Network error — could not update booking status");
    }
    setUpdating(null);
  };

  // Calculate price when vehicle or dates change
  useEffect(() => {
    if (newBooking.vehicleId && newBooking.pickupDate && newBooking.returnDate) {
      const vehicle = vehicles.find((v) => v.id === newBooking.vehicleId);
      if (vehicle) {
        const start = new Date(newBooking.pickupDate);
        const end = new Date(newBooking.returnDate);
        const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        setNewBooking((prev) => ({ ...prev, totalPrice: days * vehicle.dailyRate }));
      }
    }
  }, [newBooking.vehicleId, newBooking.pickupDate, newBooking.returnDate, vehicles]);

  const handleCreateBooking = async () => {
    if (!newBooking.customerName || !newBooking.vehicleId || !newBooking.pickupDate || !newBooking.returnDate) {
      setError("Please fill in customer name, vehicle, and dates.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/bookings", {
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
          totalPrice: newBooking.totalPrice,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // If admin wants it confirmed immediately, update status
        if (newBooking.status === "confirmed" && data.data?.id) {
          await fetch("/api/bookings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId: data.data.id, status: "confirmed" }),
          });
        }
        setShowCreateForm(false);
        setNewBooking(emptyNewBooking);
        fetchBookings();
      } else {
        setError(data.message || "Failed to create booking");
      }
    } catch {
      setError("Network error — could not create booking");
    }
    setCreating(false);
  };

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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <Input
                    type="email"
                    value={newBooking.customerEmail}
                    onChange={(e) => setNewBooking((prev) => ({ ...prev, customerEmail: e.target.value }))}
                    placeholder="john@email.com (optional)"
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

                {/* Dates */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Date *</label>
                  <Input
                    type="date"
                    value={newBooking.pickupDate}
                    onChange={(e) => setNewBooking((prev) => ({ ...prev, pickupDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Return Date *</label>
                  <Input
                    type="date"
                    value={newBooking.returnDate}
                    onChange={(e) => setNewBooking((prev) => ({ ...prev, returnDate: e.target.value }))}
                  />
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

        <p className="text-sm text-gray-500 mb-4">
          {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
          {statusFilter === "all" && <span className="text-gray-400"> (cancelled trips hidden)</span>}
        </p>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">ID</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Vehicle</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Dates</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Total</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Deposit</th>
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
                  bookings.map((b) => (
                    <tr key={b.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-purple-600">{b.id}</td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900">{b.customer_name || "—"}</div>
                        <div className="text-xs text-gray-400">{b.customer_email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{b.vehicleName}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {b.pickup_date}<br />→ {b.return_date}
                      </td>
                      <td className="px-4 py-3 font-medium">${b.total_price?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-green-600">${b.deposit?.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <Badge className={statusColors[b.status] || "bg-gray-100"}>{b.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
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
        </Card>
      </PageContainer>
    </>
  );
}
