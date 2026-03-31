"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/utils/admin-fetch";
import {
  Car, DollarSign, Calendar, CalendarDays, Users, TrendingUp, Clock,
  ArrowRight, Tag, Star, BarChart3, AlertCircle, ClipboardList, Wrench,
  RefreshCw, CheckCircle2, Settings,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { formatDate, formatTime } from "@/lib/utils/date-helpers";
import { statusColors } from "@/lib/utils/status-colors";
import { logger } from "@/lib/utils/logger";

interface DashboardData {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  activeBookings: number;
  completedBookings: number;
  totalRevenue: number;
  totalDeposits: number;
  recentBookings: Array<{
    id: string;
    customer_name: string;
    vehicleName: string;
    pickup_date: string;
    return_date: string;
    pickup_time?: string;
    return_time?: string;
    total_price: number;
    status: string;
    created_at: string;
  }>;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const res = await adminFetch("/api/bookings", { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      if (result.success) {
        const allBookings = result.data || [];
        const bookings = allBookings.filter((b: { status: string }) => b.status !== "cancelled");
        const confirmed = bookings.filter((b: { status: string }) => b.status === "confirmed");
        const pending = bookings.filter((b: { status: string }) => b.status === "pending");
        const active = bookings.filter((b: { status: string }) => b.status === "active");
        const completed = bookings.filter((b: { status: string }) => b.status === "completed");
        const revenueBookings = bookings.filter((b: { status: string }) => ["confirmed", "active", "completed"].includes(b.status));
        const totalRevenue = revenueBookings.reduce((sum: number, b: { total_price: number }) => sum + (b.total_price ?? 0), 0);
        const totalDeposits = revenueBookings.reduce((sum: number, b: { deposit: number }) => sum + (b.deposit ?? 0), 0);

        setData({
          totalBookings: bookings.length,
          confirmedBookings: confirmed.length,
          pendingBookings: pending.length,
          activeBookings: active.length,
          completedBookings: completed.length,
          totalRevenue,
          totalDeposits,
          recentBookings: bookings.slice(0, 10),
        });
      } else {
        setError(true);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      logger.error("Failed to fetch dashboard data:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  return (
    <>
      <section className="bg-gradient-to-br from-gray-900 to-purple-900 py-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="mt-1 text-purple-200">Overview of your rental business.</p>
          </div>
          {data && (
            <Button
              variant="outline"
              size="sm"
              className="border-purple-400 text-purple-200 hover:bg-purple-800 hover:text-white"
              onClick={() => fetchData()}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>
          )}
        </div>
      </section>

      <PageContainer className="py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto" role="status" aria-label="Loading dashboard" />
            <p className="mt-4 text-gray-500">Loading dashboard...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <p className="text-gray-600 mb-4">Failed to load dashboard data.</p>
            <Button onClick={() => fetchData()}>Retry</Button>
          </div>
        ) : data ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6 mb-8">
              {[
                { label: "Total Bookings", value: data.totalBookings, icon: Calendar, color: "text-purple-600", bg: "bg-purple-50" },
                { label: "Active Rentals", value: data.activeBookings, icon: Car, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Confirmed", value: data.confirmedBookings, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
                { label: "Pending", value: data.pendingBookings, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
                { label: "Revenue", value: formatCurrency(data.totalRevenue ?? 0), icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
                { label: "Collected", value: formatCurrency(data.totalDeposits ?? 0), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg ${stat.bg} p-2.5 ${stat.color}`}>
                        <stat.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xl font-bold text-gray-900 truncate">{stat.value}</p>
                        <p className="text-xs text-gray-500 truncate">{stat.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Management Quick Links */}
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Manage</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 mb-8">
              {[
                { label: "Bookings", desc: "All reservations", icon: ClipboardList, href: "/admin/bookings", color: "bg-purple-100 text-purple-700" },
                { label: "Calendar", desc: "Trip timeline", icon: CalendarDays, href: "/admin/calendar", color: "bg-indigo-100 text-indigo-700" },
                { label: "Vehicles", desc: "Manage fleet", icon: Car, href: "/admin/vehicles", color: "bg-blue-100 text-blue-700" },
                { label: "Customers", desc: "View all users", icon: Users, href: "/admin/customers", color: "bg-sky-100 text-sky-700" },
                { label: "Finances", desc: "Revenue & expenses", icon: BarChart3, href: "/admin/finances", color: "bg-emerald-100 text-emerald-700" },
                { label: "Maintenance", desc: "Service records", icon: Wrench, href: "/admin/maintenance", color: "bg-orange-100 text-orange-700" },
                { label: "Promo Codes", desc: "Discounts & coupons", icon: Tag, href: "/admin/promo-codes", color: "bg-green-100 text-green-700" },
                { label: "Reviews", desc: "Moderate feedback", icon: Star, href: "/admin/reviews", color: "bg-amber-100 text-amber-700" },
              ].map((item) => (
                <Link key={item.href} href={item.href}>
                  <Card className="group h-full cursor-pointer transition-all hover:shadow-md hover:border-purple-200 focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2">
                    <CardContent className="p-5">
                      <div className={`inline-flex rounded-lg p-2.5 mb-3 ${item.color}`}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">{item.label}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Recent Bookings */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Recent Bookings</h2>
                <p className="text-xs text-gray-400 mt-0.5">{data.recentBookings.length} most recent</p>
              </div>
              <Link href="/admin/bookings">
                <Button variant="outline" size="sm" className="gap-1.5 text-purple-700 border-purple-200 hover:bg-purple-50 hover:border-purple-300">
                  View All <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            {data.recentBookings.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No bookings yet</p>
                  <p className="text-sm text-gray-400 mt-1">They&apos;ll show up here once customers start booking.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2.5">
                {data.recentBookings.map((booking) => {
                  const statusAccent: Record<string, string> = {
                    pending: "border-l-yellow-400",
                    confirmed: "border-l-green-400",
                    active: "border-l-blue-400",
                    completed: "border-l-gray-300",
                    cancelled: "border-l-red-400",
                    "no-show": "border-l-orange-400",
                  };
                  const statusDot: Record<string, string> = {
                    pending: "bg-yellow-400",
                    confirmed: "bg-green-400",
                    active: "bg-blue-400",
                    completed: "bg-gray-300",
                    cancelled: "bg-red-400",
                    "no-show": "bg-orange-400",
                  };
                  const accent = statusAccent[booking.status] || "border-l-gray-300";
                  const dot = statusDot[booking.status] || "bg-gray-300";
                  const isActive = booking.status === "active";
                  const isPending = booking.status === "pending";

                  return (
                    <div
                      key={booking.id}
                      onClick={() => router.push(`/admin/bookings?booking=${booking.id}`)}
                      className={`group relative rounded-xl border border-gray-200 border-l-[3px] ${accent} bg-white hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer overflow-hidden ${isPending ? "ring-1 ring-yellow-100" : ""}`}
                    >
                      <div className="px-4 py-3.5 sm:px-5">
                        {/* Top row: Customer + Status + Price */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-purple-700 transition-colors">
                                {booking.customer_name || "Unknown Customer"}
                              </h3>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className={`inline-block w-1.5 h-1.5 rounded-full ${dot} ${isActive ? "animate-pulse" : ""}`} />
                                <span className={`text-[11px] font-semibold uppercase tracking-wide ${
                                  booking.status === "pending" ? "text-yellow-600" :
                                  booking.status === "confirmed" ? "text-green-600" :
                                  booking.status === "active" ? "text-blue-600" :
                                  "text-gray-400"
                                }`}>{booking.status}</span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                              <Car className="h-3 w-3 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{booking.vehicleName || "—"}</span>
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-base font-bold text-gray-900 tabular-nums">
                              ${(booking.total_price ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                          </div>
                        </div>

                        {/* Bottom row: Dates */}
                        <div className="mt-2.5 flex items-center gap-2 text-xs">
                          <div className="flex items-center gap-1 bg-gray-50 rounded-md px-2 py-1">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-700 font-medium">{formatDate(booking.pickup_date)}</span>
                            {booking.pickup_time && (
                              <span className="text-purple-600 font-medium">{formatTime(booking.pickup_time)}</span>
                            )}
                          </div>
                          <ArrowRight className="h-3 w-3 text-gray-300 flex-shrink-0" />
                          <div className="flex items-center gap-1 bg-gray-50 rounded-md px-2 py-1">
                            <span className="text-gray-700 font-medium">{formatDate(booking.return_date)}</span>
                            {booking.return_time && (
                              <span className="text-purple-600 font-medium">{formatTime(booking.return_time)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Hover arrow indicator */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="h-4 w-4 text-purple-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : null}
      </PageContainer>
    </>
  );
}
