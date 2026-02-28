"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import {
  DollarSign,
  TrendingUp,
  Clock,
  Car,
  Download,
  Calendar,
} from "lucide-react";
import type { Booking, Vehicle } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/date-helpers";

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function BarChart({
  data,
  maxValue,
}: {
  data: { label: string; value: number }[];
  maxValue: number;
}) {
  return (
    <div className="flex items-end gap-2 h-48">
      {data.map((item) => {
        const height = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        return (
          <div
            key={item.label}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <span className="text-xs text-gray-500 font-medium">
              {item.value > 0 ? `$${Math.round(item.value / 1000)}k` : ""}
            </span>
            <div
              className="w-full bg-primary/80 rounded-t-md hover:bg-primary transition-colors min-h-[2px]"
              style={{ height: `${Math.max(height, 2)}%` }}
              title={`${item.label}: ${formatCurrency(item.value)}`}
            />
            <span className="text-xs text-gray-400">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let cumulativePercent = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 36 36" className="w-full h-full">
          {segments.map((segment) => {
            const percent = total > 0 ? (segment.value / total) * 100 : 0;
            const dashArray = `${percent} ${100 - percent}`;
            const dashOffset = 100 - cumulativePercent + 25;
            cumulativePercent += percent;
            return (
              <circle
                key={segment.label}
                className="fill-none"
                cx="18"
                cy="18"
                r="15.9"
                stroke={segment.color}
                strokeWidth="3"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-gray-900">{total}</span>
        </div>
      </div>
      <div className="space-y-2">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-sm text-gray-600">
              {segment.label}: {segment.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RevenuePage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("year");

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
      } catch (error) {
        console.error("Failed to fetch revenue data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const activeBookings = bookings.filter((b) => b.status !== "cancelled");
    const totalRevenue = activeBookings.reduce(
      (sum, b) => sum + b.totalPrice,
      0
    );
    const avgDuration =
      activeBookings.length > 0
        ? activeBookings.reduce((sum, b) => {
            const days = Math.ceil(
              (new Date(b.returnDate).getTime() -
                new Date(b.pickupDate).getTime()) /
                (1000 * 60 * 60 * 24)
            );
            return sum + days;
          }, 0) / activeBookings.length
        : 0;

    // Most popular vehicle
    const vehicleCounts = new Map<string, number>();
    activeBookings.forEach((b) => {
      vehicleCounts.set(
        b.vehicleId,
        (vehicleCounts.get(b.vehicleId) || 0) + 1
      );
    });
    let popularVehicleId = "";
    let maxCount = 0;
    vehicleCounts.forEach((count, id) => {
      if (count > maxCount) {
        maxCount = count;
        popularVehicleId = id;
      }
    });
    const popularVehicle = vehicles.find((v) => v.id === popularVehicleId);

    // Extras attachment rate
    const withExtras = activeBookings.filter(
      (b) => b.extras && b.extras.length > 0
    ).length;
    const extrasRate =
      activeBookings.length > 0
        ? Math.round((withExtras / activeBookings.length) * 100)
        : 0;

    // Monthly revenue data
    const monthlyRevenue = months.map((_, i) => {
      const monthBookings = activeBookings.filter((b) => {
        const date = new Date(b.createdAt);
        return date.getMonth() === i;
      });
      return {
        label: months[i],
        value: monthBookings.reduce((sum, b) => sum + b.totalPrice, 0),
      };
    });
    const maxMonthly = Math.max(...monthlyRevenue.map((m) => m.value), 1);

    // Booking status breakdown
    const statusCounts = {
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      active: bookings.filter((b) => b.status === "active").length,
      completed: bookings.filter((b) => b.status === "completed").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
      pending: bookings.filter((b) => b.status === "pending").length,
    };

    return {
      totalRevenue,
      avgDuration: Math.round(avgDuration * 10) / 10,
      popularVehicle: popularVehicle?.name || "N/A",
      extrasRate,
      bookingCount: activeBookings.length,
      monthlyRevenue,
      maxMonthly,
      statusCounts,
    };
  }, [bookings, vehicles]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                  <div className="h-8 w-24 bg-gray-200 rounded" />
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
      {/* Date Range Selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {["month", "quarter", "year"].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                dateRange === range
                  ? "bg-primary text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              This {range}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Rental Duration</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats.avgDuration} days
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Most Popular</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {stats.popularVehicle}
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Extras Attachment</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats.extrasRate}%
                </p>
              </div>
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                data={stats.monthlyRevenue}
                maxValue={stats.maxMonthly}
              />
            </CardContent>
          </Card>
        </div>

        {/* Booking Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Status</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              segments={[
                {
                  label: "Confirmed",
                  value: stats.statusCounts.confirmed,
                  color: "#3B82F6",
                },
                {
                  label: "Active",
                  value: stats.statusCounts.active,
                  color: "#10B981",
                },
                {
                  label: "Completed",
                  value: stats.statusCounts.completed,
                  color: "#6B7280",
                },
                {
                  label: "Pending",
                  value: stats.statusCounts.pending,
                  color: "#F59E0B",
                },
                {
                  label: "Cancelled",
                  value: stats.statusCounts.cancelled,
                  color: "#EF4444",
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      {/* Top Vehicles by Revenue */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {vehicles.map((vehicle) => {
              const vehicleBookings = bookings.filter(
                (b) => b.vehicleId === vehicle.id && b.status !== "cancelled"
              );
              const vehicleRevenue = vehicleBookings.reduce(
                (sum, b) => sum + b.totalPrice,
                0
              );
              const maxRevenue = Math.max(
                ...vehicles.map((v) =>
                  bookings
                    .filter((b) => b.vehicleId === v.id && b.status !== "cancelled")
                    .reduce((sum, b) => sum + b.totalPrice, 0)
                ),
                1
              );
              const barWidth = (vehicleRevenue / maxRevenue) * 100;

              return (
                <div key={vehicle.id} className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium text-gray-700 shrink-0 truncate">
                    {vehicle.name}
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded-full flex items-center justify-end px-2 transition-all duration-500"
                      style={{ width: `${Math.max(barWidth, 5)}%` }}
                    >
                      <span className="text-xs text-white font-medium whitespace-nowrap">
                        {formatCurrency(vehicleRevenue)}
                      </span>
                    </div>
                  </div>
                  <div className="w-16 text-right text-sm text-gray-500 shrink-0">
                    {vehicleBookings.length} trips
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
