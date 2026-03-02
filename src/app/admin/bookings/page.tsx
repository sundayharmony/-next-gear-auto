"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { useAuth } from "@/lib/context/auth-context";

interface BookingRow {
  id: string;
  customer_name: string;
  customer_email: string;
  vehicleName: string;
  pickup_date: string;
  return_date: string;
  total_price: number;
  deposit: number;
  status: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  active: "bg-blue-100 text-blue-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
  "no-show": "bg-orange-100 text-orange-700",
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        setBookings(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

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
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
        );
      } else {
        setError(data.message || `Failed to update booking to "${newStatus}"`);
      }
    } catch {
      setError("Network error — could not update booking status");
    }
    setUpdating(null);
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

        {/* Filters */}
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
          <Button variant="outline" size="sm" onClick={fetchBookings} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
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
