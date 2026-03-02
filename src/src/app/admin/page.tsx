"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import {
  CalendarCheck,
  DollarSign,
  Car,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Users,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import type { Booking, Customer, Vehicle, ActivityItem } from "@/lib/types";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  icon: React.ReactNode;
  href?: string;
}

function MetricCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  href,
}: MetricCardProps) {
  const content = (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
            {change && (
              <div className="flex items-center gap-1 mt-2">
                {changeType === "up" ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : changeType === "down" ? (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                ) : null}
                <span
                  className={`text-sm ${
                    changeType === "up"
                      ? "text-green-600"
                      : changeType === "down"
                        ? "text-red-600"
                        : "text-gray-500"
                  }`}
                >
                  {change}
                </span>
              </div>
            )}
          </div>
          <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function ActivityBadge({ type }: { type: ActivityItem["type"] }) {
  const config = {
    booking: { bg: "bg-blue-100", text: "text-blue-700", label: "Booking" },
    cancellation: {
      bg: "bg-red-100",
      text: "text-red-700",
      label: "Cancelled",
    },
    signup: { bg: "bg-green-100", text: "text-green-700", label: "Signup" },
    review: {
      bg: "bg-purple-100",
      text: "text-purple-700",
      label: "Review",
    },
  };
  const c = config[type];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}
    >
      {c.label}
    </span>
  );
}

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [bookingsRes, vehiclesRes] = await Promise.all([
          fetch("/api/bookings"),
          fetch("/api/vehicles"),
        ]);
        const bookingsData = await bookingsRes.json();
        const vehiclesData = await vehiclesRes.json();

        setBookings(bookingsData.data || []);
        setVehicles(vehiclesData.data || []);

        // Simulate customers from bookings
        const uniqueCustomers = Array.from(
          new Set(
            (bookingsData.data || []).map((b: Booking) => b.customerId)
          )
        );
        setCustomers(
          uniqueCustomers.map((id, i) => ({
            id: id as string,
            name: `Customer ${i + 1}`,
            email: `customer${i + 1}@example.com`,
            phone: "",
            dob: "",
            driverLicense: null,
            paymentMethods: [],
            bookings: [],
            createdAt: new Date().toISOString(),
            role: "customer" as const,
          }))
        );
      } catch (error) {
        console.error("Failed to fetch admin data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const activeBookings = bookings.filter(
    (b) => b.status === "active" || b.status === "confirmed"
  ).length;
  const pendingBookings = bookings.filter(
    (b) => b.status === "pending"
  ).length;
  const monthlyRevenue = bookings
    .filter((b) => b.status !== "cancelled")
    .reduce((sum, b) => sum + b.totalPrice, 0);
  const rentedVehicles = vehicles.filter((v) => !v.isAvailable).length;
  const fleetUtilization =
    vehicles.length > 0
      ? Math.round((rentedVehicles / vehicles.length) * 100)
      : 0;

  // Generate activity feed from bookings
  const activityFeed: ActivityItem[] = bookings
    .slice(0, 8)
    .map((b) => ({
      id: b.id,
      type:
        b.status === "cancelled"
          ? ("cancellation" as const)
          : ("booking" as const),
      message:
        b.status === "cancelled"
          ? `Booking #${b.id.slice(-6)} was cancelled`
          : `New booking #${b.id.slice(-6)} for ${b.vehicleName || "vehicle"}`,
      timestamp: b.createdAt,
    }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-8 w-16 bg-gray-200 rounded" />
                  <div className="h-3 w-20 bg-gray-200 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Active Bookings"
          value={activeBookings}
          change={`${pendingBookings} pending`}
          changeType="neutral"
          icon={<CalendarCheck className="w-6 h-6 text-primary" />}
          href="/admin/bookings"
        />
        <MetricCard
          title="Monthly Revenue"
          value={`$${monthlyRevenue.toLocaleString()}`}
          change="+12.5% vs last month"
          changeType="up"
          icon={<DollarSign className="w-6 h-6 text-primary" />}
          href="/admin/revenue"
        />
        <MetricCard
          title="Fleet Utilization"
          value={`${fleetUtilization}%`}
          change={`${rentedVehicles}/${vehicles.length} vehicles rented`}
          changeType={fleetUtilization > 60 ? "up" : "down"}
          icon={<Car className="w-6 h-6 text-primary" />}
          href="/admin/vehicles"
        />
        <MetricCard
          title="Total Customers"
          value={customers.length}
          change="+3 this week"
          changeType="up"
          icon={<Users className="w-6 h-6 text-primary" />}
          href="/admin/customers"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Feed */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Link
                href="/admin/bookings"
                className="text-sm text-primary hover:text-primary-dark flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </CardHeader>
            <CardContent>
              {activityFeed.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">No recent activity</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {activityFeed.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="flex items-center gap-3">
                        <ActivityBadge type={activity.type} />
                        <span className="text-sm text-gray-700">
                          {activity.message}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Pending Items */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">
                    ID Verifications
                  </span>
                </div>
                <span className="text-lg font-bold text-amber-700">
                  {pendingBookings}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Pending Bookings
                  </span>
                </div>
                <span className="text-lg font-bold text-blue-700">
                  {pendingBookings}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href="/admin/bookings"
                className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Manage Bookings
              </Link>
              <Link
                href="/admin/vehicles"
                className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Update Fleet
              </Link>
              <Link
                href="/admin/customers"
                className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Customer Profiles
              </Link>
              <Link
                href="/admin/revenue"
                className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Revenue Reports
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
