"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Car, DollarSign, Calendar, Users, TrendingUp, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { useAuth } from "@/lib/context/auth-context";

interface DashboardData {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  activeBookings: number;
  totalRevenue: number;
  totalDeposits: number;
  recentBookings: Array<{
    id: string;
    customer_name: string;
    vehicleName: string;
    pickup_date: string;
    return_date: string;
    total_price: number;
    status: string;
    created_at: string;
  }>;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  active: "bg-blue-100 text-blue-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
  "no-show": "bg-orange-100 text-orange-700",
};

export default function AdminDashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/bookings");
        const result = await res.json();
        if (result.success) {
          const bookings = result.data || [];
          const confirmed = bookings.filter((b: { status: string }) => b.status === "confirmed");
          const pending = bookings.filter((b: { status: string }) => b.status === "pending");
          const active = bookings.filter((b: { status: string }) => b.status === "active");
          const totalRevenue = bookings
            .filter((b: { status: string }) => ["confirmed", "active", "completed"].includes(b.status))
            .reduce((sum: number, b: { total_price: number }) => sum + (b.total_price || 0), 0);
          const totalDeposits = bookings
            .filter((b: { status: string }) => ["confirmed", "active", "completed"].includes(b.status))
            .reduce((sum: number, b: { deposit: number }) => sum + (b.deposit || 0), 0);

          setData({
            totalBookings: bookings.length,
            confirmedBookings: confirmed.length,
            pendingBookings: pending.length,
            activeBookings: active.length,
            totalRevenue,
            totalDeposits,
            recentBookings: bookings.slice(0, 10),
          });
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <PageContainer className="py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-4">You need admin privileges to view this page.</p>
        <Link href="/login"><Button>Sign In</Button></Link>
      </PageContainer>
    );
  }

  return (
    <>
      <section className="bg-gradient-to-br from-gray-900 to-purple-900 py-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="mt-1 text-purple-200">Manage bookings, vehicles, and customers.</p>
        </div>
      </section>

      <PageContainer className="py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-gray-500">Loading dashboard...</p>
          </div>
        ) : data ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
              {[
                { label: "Total Bookings", value: data.totalBookings, icon: Calendar, color: "text-purple-600" },
                { label: "Active Rentals", value: data.activeBookings, icon: Car, color: "text-blue-600" },
                { label: "Revenue", value: `$${data.totalRevenue.toFixed(0)}`, icon: DollarSign, color: "text-green-600" },
                { label: "Deposits Collected", value: `$${data.totalDeposits.toFixed(0)}`, icon: TrendingUp, color: "text-emerald-600" },
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg bg-gray-50 p-2.5 ${stat.color}`}>
                        <stat.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-xs text-gray-500">{stat.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Status */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-8">
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4 flex items-center gap-3">
                  <Clock className="h-8 w-8 text-yellow-600" />
                  <div>
                    <p className="text-2xl font-bold text-yellow-700">{data.pendingBookings}</p>
                    <p className="text-sm text-yellow-600">Pending Payments</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4 flex items-center gap-3">
                  <Calendar className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-700">{data.confirmedBookings}</p>
                    <p className="text-sm text-green-600">Confirmed Bookings</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4 flex items-center gap-3">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-700">{data.activeBookings}</p>
                    <p className="text-sm text-blue-600">Active Rentals</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Bookings */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Recent Bookings</h2>
              <Link href="/admin/bookings">
                <Button variant="outline" size="sm">
                  View All <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>

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
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentBookings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                          No bookings yet. They&apos;ll show up here once customers start booking.
                        </td>
                      </tr>
                    ) : (
                      data.recentBookings.map((booking) => (
                        <tr key={booking.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs text-purple-600">{booking.id}</td>
                          <td className="px-4 py-3 text-gray-900">{booking.customer_name || "—"}</td>
                          <td className="px-4 py-3 text-gray-600">{booking.vehicleName}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {booking.pickup_date} → {booking.return_date}
                          </td>
                          <td className="px-4 py-3 font-medium">${booking.total_price?.toFixed(2) || "—"}</td>
                          <td className="px-4 py-3">
                            <Badge className={statusColors[booking.status] || "bg-gray-100 text-gray-600"}>
                              {booking.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        ) : (
          <p className="text-center text-gray-500 py-12">Failed to load dashboard data.</p>
        )}
      </PageContainer>
    </>
  );
}
