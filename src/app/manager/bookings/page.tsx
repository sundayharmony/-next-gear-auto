"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Plus, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageContainer } from "@/components/layout/page-container";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { logger } from "@/lib/utils/logger";
import { formatDate } from "@/lib/utils/date-helpers";

interface BookingRow {
  id: string;
  customer_name: string;
  customer_email: string;
  vehicle_id: string;
  vehicleName?: string;
  pickup_date: string;
  return_date: string;
  status: string;
  total_price: number | null;
  canViewPricing?: boolean;
  canManage?: boolean;
}

interface VehicleOption {
  id: string;
  year: number;
  make: string;
  model: string;
}

export default function ManagerBookingsPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    vehicleId: "",
    pickupDate: "",
    returnDate: "",
    totalPrice: "",
  });

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingsRes, vehiclesRes] = await Promise.all([
        adminFetch("/api/manager/bookings"),
        fetch("/api/vehicles"),
      ]);
      const [bookingsJson, vehiclesJson] = await Promise.all([bookingsRes.json(), vehiclesRes.json()]);
      if (bookingsRes.ok && bookingsJson.success) {
        setBookings(bookingsJson.data || []);
      }
      if (vehiclesRes.ok && vehiclesJson.success) {
        setVehicles(vehiclesJson.data || []);
      }
    } catch (error) {
      logger.error("Failed to fetch manager bookings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCreateBooking = useCallback(async () => {
    if (!form.customerName || !form.customerEmail || !form.vehicleId || !form.pickupDate || !form.returnDate) {
      setMessage("Please fill all required fields.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      const res = await adminFetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          vehicleId: form.vehicleId,
          pickupDate: form.pickupDate,
          returnDate: form.returnDate,
          totalPrice: Number(form.totalPrice || 0),
          extras: [],
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMessage("Booking created.");
        setForm({
          customerName: "",
          customerEmail: "",
          customerPhone: "",
          vehicleId: "",
          pickupDate: "",
          returnDate: "",
          totalPrice: "",
        });
        await fetchBookings();
      } else {
        setMessage(json.message || "Failed to create booking.");
      }
    } catch (error) {
      logger.error("Failed to create manager booking:", error);
      setMessage("Failed to create booking.");
    } finally {
      setSubmitting(false);
    }
  }, [fetchBookings, form]);

  const bookingCountByStatus = useMemo(() => {
    return bookings.reduce<Record<string, number>>((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      return acc;
    }, {});
  }, [bookings]);

  const updateBookingStatus = useCallback(async (bookingId: string, status: string) => {
    setUpdatingId(bookingId);
    try {
      const res = await adminFetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, status }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMessage(`Booking ${bookingId} updated to ${status}.`);
        await fetchBookings();
      } else {
        setMessage(json.message || "Failed to update booking status.");
      }
    } catch (error) {
      logger.error("Failed to update manager booking:", error);
      setMessage("Failed to update booking status.");
    } finally {
      setUpdatingId(null);
    }
  }, [fetchBookings]);

  return (
    <>
      <section className="bg-gradient-to-br from-gray-900 to-purple-900 py-6 sm:py-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Manager Bookings</h1>
            <p className="mt-1 text-sm sm:text-base text-purple-200">View all active and upcoming trips. Pricing is only shown on trips you created.</p>
          </div>
          <Button variant="outline" size="sm" className="border-purple-400 text-purple-200 hover:bg-purple-800 hidden sm:inline-flex" onClick={fetchBookings}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </section>

      <PageContainer className="py-6 sm:py-8 space-y-6">
        <Card>
          <CardContent className="p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-purple-600" /> Create Booking</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Input placeholder="Customer name" value={form.customerName} onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))} />
              <Input type="email" placeholder="Customer email" value={form.customerEmail} onChange={(e) => setForm((prev) => ({ ...prev, customerEmail: e.target.value }))} />
              <Input placeholder="Customer phone (optional)" value={form.customerPhone} onChange={(e) => setForm((prev) => ({ ...prev, customerPhone: e.target.value }))} />
              <Select value={form.vehicleId} onChange={(e) => setForm((prev) => ({ ...prev, vehicleId: e.target.value }))}>
                <option value="">Select vehicle</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </option>
                ))}
              </Select>
              <Input type="date" value={form.pickupDate} onChange={(e) => setForm((prev) => ({ ...prev, pickupDate: e.target.value }))} />
              <Input type="date" value={form.returnDate} onChange={(e) => setForm((prev) => ({ ...prev, returnDate: e.target.value }))} />
              <Input type="number" placeholder="Total price" value={form.totalPrice} onChange={(e) => setForm((prev) => ({ ...prev, totalPrice: e.target.value }))} />
              <Button onClick={handleCreateBooking} disabled={submitting}>
                {submitting ? "Creating..." : "Create"}
              </Button>
            </div>
            {message && <p className="text-sm text-gray-600 mt-3">{message}</p>}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(bookingCountByStatus).map(([status, count]) => (
            <Card key={status}><CardContent className="p-4"><p className="text-xs uppercase text-gray-500">{status}</p><p className="text-xl font-bold text-gray-900">{count}</p></CardContent></Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Active &amp; Upcoming Trips</h2>
            {loading ? (
              <div className="text-center py-8"><RefreshCw className="h-6 w-6 animate-spin text-purple-600 mx-auto" /></div>
            ) : bookings.length === 0 ? (
              <p className="text-gray-500">No active or upcoming trips found.</p>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => (
                  <div key={booking.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{booking.customer_name}</p>
                        <p className="text-xs text-gray-500">{booking.customer_email}</p>
                      </div>
                      <span className="text-xs font-semibold uppercase text-purple-600">{booking.status}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 flex items-center gap-2"><Calendar className="h-4 w-4" /> {formatDate(booking.pickup_date)} to {formatDate(booking.return_date)}</p>
                    <p className="text-sm text-gray-600">{booking.vehicleName || booking.vehicle_id}</p>
                    <p className="text-sm text-gray-600">
                      {booking.canViewPricing
                        ? `Trip price: $${Number(booking.total_price ?? 0).toFixed(2)}`
                        : "Trip price: hidden (not created by you)"}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {booking.canManage && booking.status === "pending" && (
                        <Button size="sm" variant="outline" disabled={updatingId === booking.id} onClick={() => updateBookingStatus(booking.id, "confirmed")}>
                          Confirm
                        </Button>
                      )}
                      {booking.canManage && booking.status === "confirmed" && (
                        <Button size="sm" variant="outline" disabled={updatingId === booking.id} onClick={() => updateBookingStatus(booking.id, "active")}>
                          Start
                        </Button>
                      )}
                      {booking.canManage && booking.status === "active" && (
                        <Button size="sm" variant="outline" disabled={updatingId === booking.id} onClick={() => updateBookingStatus(booking.id, "completed")}>
                          Complete
                        </Button>
                      )}
                      {booking.canManage && !["cancelled", "completed"].includes(booking.status) && (
                        <Button size="sm" variant="outline" disabled={updatingId === booking.id} onClick={() => updateBookingStatus(booking.id, "cancelled")}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </>
  );
}
