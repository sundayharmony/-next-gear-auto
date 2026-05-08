"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/utils/admin-fetch";
import type { LucideIcon } from "lucide-react";
import {
  Car, DollarSign, Calendar, CalendarDays, Users, TrendingUp, Clock,
  ArrowRight, Tag, Star, BarChart3, AlertCircle, ClipboardList, Wrench,
  RefreshCw, CheckCircle2, Settings, Sparkles, MapPin, FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { formatDate, formatTime, getLocalYmd } from "@/lib/utils/date-helpers";
import { logger } from "@/lib/utils/logger";
import { getVehicleDisplayName } from "@/lib/types";

interface BookingRow {
  id: string;
  customer_name: string;
  vehicleName: string;
  pickup_date: string;
  return_date: string;
  pickup_time?: string;
  return_time?: string;
  total_price: number;
  deposit?: number;
  status: string;
  created_at: string;
}

interface DashboardData {
  confirmedBookings: number;
  pendingBookings: number;
  activeBookings: number;
  totalRevenue: number;
  totalDeposits: number;
  recentBookings: BookingRow[];
}

interface MaintenanceRow {
  id: string;
  title: string;
  vehicleName: string;
  scheduledDate: string;
}

interface TodayHighlightLists {
  pickups: { key: string; label: string; sub: string; href: string }[];
  returns: { key: string; label: string; sub: string; href: string }[];
  maintenance: { key: string; label: string; sub: string; href: string }[];
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function fetchJsonData<T>(path: string, signal?: AbortSignal): Promise<T | null> {
  try {
    const res = await adminFetch(path, { signal });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success) return null;
    return json.data as T;
  } catch {
    return null;
  }
}

/** Calendar day from DB date or ISO datetime (YYYY-MM-DD). */
function bookingCalendarDay(value: string | null | undefined): string {
  if (!value) return "";
  const s = String(value).trim();
  if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function buildHighlights(
  todayStr: string,
  bookings: BookingRow[],
  maintenance: MaintenanceRow[] | null
): TodayHighlightLists {
  const pickups: TodayHighlightLists["pickups"] = [];
  const returns: TodayHighlightLists["returns"] = [];
  const seen = new Set<string>();

  // Only website reservations — not blocked_dates / Turo calendar rows (those can disagree with rental pickup/return dates).
  for (const b of bookings) {
    if (b.status === "cancelled") continue;

    const pickupDay = bookingCalendarDay(b.pickup_date);
    const returnDay = bookingCalendarDay(b.return_date);

    // Pickups today: rentals not finished before pickup (pending / confirmed / active)
    if (
      pickupDay === todayStr &&
      (b.status === "pending" || b.status === "confirmed" || b.status === "active")
    ) {
      const key = `b-pu-${b.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        pickups.push({
          key,
          label: b.customer_name || "Customer",
          sub: b.vehicleName || "Vehicle",
          href: `/admin/bookings?booking=${b.id}`,
        });
      }
    }

    // Returns today: any non-cancelled trip whose return day is today
    if (returnDay === todayStr) {
      const key = `b-rt-${b.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        returns.push({
          key,
          label: b.customer_name || "Customer",
          sub: b.vehicleName || "Vehicle",
          href: `/admin/bookings?booking=${b.id}`,
        });
      }
    }
  }

  const maintList: TodayHighlightLists["maintenance"] = (maintenance || []).map((m) => ({
    key: `m-${m.id}`,
    label: m.title || "Maintenance",
    sub: m.vehicleName || "Vehicle",
    href: "/admin/maintenance",
  }));

  return { pickups, returns, maintenance: maintList };
}

const QUICK_NAV = [
  { label: "Bookings", href: "/admin/bookings", icon: ClipboardList },
  { label: "Calendar", href: "/admin/calendar", icon: CalendarDays },
  { label: "Vehicles", href: "/admin/vehicles", icon: Car },
  { label: "Finances", href: "/admin/finances", icon: BarChart3 },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Maintenance", href: "/admin/maintenance", icon: Wrench },
  { label: "Promo Codes", href: "/admin/promo-codes", icon: Tag },
  { label: "Reviews", href: "/admin/reviews", icon: Star },
  { label: "Managers", href: "/admin/managers", icon: Settings },
  { label: "Week-to-Week Contract", href: "/week-to-week-contract", icon: FileText },
] as const;

function HighlightColumn({
  title,
  icon: Icon,
  items,
  emptyText,
}: {
  title: string;
  icon: LucideIcon;
  items: { key: string; label: string; sub: string; href: string }[];
  emptyText: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-900">
        <Icon className="h-4 w-4 text-purple-600 shrink-0" />
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-500 py-2">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="block rounded-lg border border-transparent px-2 py-1.5 -mx-2 hover:border-purple-100 hover:bg-purple-50/60 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900 truncate">{item.label}</p>
                <p className="text-xs text-gray-500 truncate">{item.sub}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [highlights, setHighlights] = useState<TodayHighlightLists | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const todayStr = getLocalYmd(new Date());

      const bookingsRes = await adminFetch("/api/bookings", { signal });
      if (!bookingsRes.ok) throw new Error(`HTTP ${bookingsRes.status}`);
      const result = await bookingsRes.json();
      if (!result.success) {
        setError(true);
        return;
      }

      const allBookings: BookingRow[] = (result.data || []).map((b: Record<string, unknown>) => ({
        id: String(b.id),
        customer_name: String(b.customer_name ?? ""),
        vehicleName: String(b.vehicleName ?? ""),
        pickup_date: String(b.pickup_date ?? ""),
        return_date: String(b.return_date ?? ""),
        pickup_time: b.pickup_time ? String(b.pickup_time) : undefined,
        return_time: b.return_time ? String(b.return_time) : undefined,
        total_price: Number(b.total_price ?? 0),
        deposit: b.deposit !== undefined && b.deposit !== null ? Number(b.deposit) : undefined,
        status: String(b.status ?? ""),
        created_at: String(b.created_at ?? ""),
      }));

      const maintenanceRows = await fetchJsonData<MaintenanceRow[]>(
        `/api/admin/maintenance?from=${encodeURIComponent(todayStr)}&to=${encodeURIComponent(todayStr)}`,
        signal
      );

      const bookings = allBookings.filter((b) => b.status !== "cancelled");
      const confirmed = bookings.filter((b) => b.status === "confirmed");
      const pending = bookings.filter((b) => b.status === "pending");
      const active = bookings.filter((b) => b.status === "active");
      const revenueBookings = bookings.filter((b) => ["confirmed", "active", "completed"].includes(b.status));
      const totalRevenue = revenueBookings.reduce((sum, b) => sum + (b.total_price ?? 0), 0);
      const totalDeposits = revenueBookings.reduce((sum, b) => sum + (b.deposit ?? 0), 0);

      const pendingActive = bookings.filter((b) => b.status === "pending" || b.status === "active");
      const recentBookings = [...pendingActive]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

      setHighlights(buildHighlights(todayStr, allBookings, maintenanceRows));

      setData({
        confirmedBookings: confirmed.length,
        pendingBookings: pending.length,
        activeBookings: active.length,
        totalRevenue,
        totalDeposits,
        recentBookings,
      });
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
      <section className="bg-gradient-to-br from-gray-900 to-purple-900 py-6 sm:py-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
            <p className="mt-1 text-sm sm:text-base text-purple-200">Overview of your rental business.</p>
          </div>
          {data && (
            <Button
              variant="outline"
              size="sm"
              className="border-purple-400 text-purple-200 hover:bg-purple-800 hover:text-white hidden sm:inline-flex"
              onClick={() => fetchData()}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>
          )}
        </div>
      </section>

      <PageContainer className="py-6 sm:py-8">
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
            <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-5 mb-8">
              {[
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

            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h2 className="text-xl font-semibold text-gray-900">Today&apos;s highlights</h2>
              </div>
              {highlights && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4">
                  <HighlightColumn
                    title="Pickups today"
                    icon={MapPin}
                    items={highlights.pickups}
                    emptyText="No pickups scheduled for today."
                  />
                  <HighlightColumn
                    title="Returns today"
                    icon={Calendar}
                    items={highlights.returns}
                    emptyText="No returns scheduled for today."
                  />
                  <HighlightColumn
                    title="Maintenance today"
                    icon={Wrench}
                    items={highlights.maintenance}
                    emptyText="No maintenance scheduled for today."
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {QUICK_NAV.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Badge
                      variant="secondary"
                      className="cursor-pointer px-3 py-1.5 text-xs font-medium hover:bg-purple-100 hover:text-purple-900 transition-colors"
                    >
                      <item.icon className="h-3 w-3 mr-1 inline" />
                      {item.label}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Recent bookings</h2>
                <p className="text-xs text-gray-400 mt-0.5">Pending &amp; active only, up to 10, newest first</p>
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
                  <p className="text-gray-500 font-medium">No pending or active rentals</p>
                  <p className="text-sm text-gray-400 mt-1">When new bookings need action or vehicles are out, they will appear here.</p>
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
                      className={`group relative rounded-xl border border-gray-200 border-l-[3px] ${accent} bg-white hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer overflow-hidden admin-card-press ${isPending ? "ring-1 ring-yellow-100" : ""}`}
                    >
                      <div className="px-4 py-3.5 sm:px-5">
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
                              ${(booking.total_price ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
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
