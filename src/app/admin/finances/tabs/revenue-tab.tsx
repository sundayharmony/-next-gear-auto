"use client";

import React from "react";
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  Car,
  Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatDate } from "@/lib/utils/date-helpers";
import { prorateBookingRevenueInRange } from "@/lib/finance/booking-proration";
import { getVehicleDisplayName } from "@/lib/types";
import { StatCard, SectionHeader, fmtCurrency } from "../finances-shared";
import type { FinancesTabProps } from "../finances-tab-types";

export function RevenueTab(props: FinancesTabProps) {
  const {
    dateRange,
    summaryData,
    revenueByMonth,
    turoRevenueEntries,
    revenueBookings,
    tripExpenseTotalsByBlockedId,
    vehicleMap,
    setActiveTab,
    setAddingExpense,
    setNewExpense,
    setSelectedVehicleId,
  } = props;

  return (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Total Revenue"
                value={fmtCurrency(summaryData.totalRevenue)}
                icon={<DollarSign className="h-4 w-4" />}
                accent="green"
              />
              <StatCard
                label="Total Bookings"
                value={`${summaryData.totalBookings}`}
                icon={<Car className="h-4 w-4" />}
                accent="blue"
              />
              <StatCard
                label="Avg per Booking"
                value={fmtCurrency(summaryData.avgBookingValue)}
                icon={<BarChart3 className="h-4 w-4" />}
                accent="purple"
              />
              <StatCard
                label="Best Month"
                value={fmtCurrency(Math.max(0, ...revenueByMonth.map((m) => m.revenue)))}
                icon={<TrendingUp className="h-4 w-4" />}
                accent="amber"
              />
            </div>

            {/* Revenue by Month Chart */}
            <Card className="rounded-2xl">
              <CardContent className="p-4 sm:p-5">
                <SectionHeader
                  title="Revenue by Month"
                  subtitle={`${revenueByMonth.length} months of booking revenue`}
                />
                {revenueByMonth.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <BarChart3 className="h-8 w-8 mb-2" />
                    <p className="text-sm">No revenue data for the selected date range</p>
                  </div>
                ) : (
                  <div className="h-56 sm:h-72 lg:h-80">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <BarChart data={revenueByMonth} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
                          contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                        />
                        <Bar dataKey="revenue" fill="#10B981" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Turo trips in range — revenue from earnings/reason; trip-level expenses */}
            <Card className="rounded-2xl">
              <CardContent className="p-4 sm:p-5">
                <SectionHeader
                  title="Turo trips"
                  subtitle={`${turoRevenueEntries.length} in date range — add gas, rideshare, or other trip costs`}
                />
                {turoRevenueEntries.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No Turo blocks in this range</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {turoRevenueEntries.map((trip) => {
                      const vehicle = vehicleMap.get(trip.vehicle_id);
                      const tripCosts = tripExpenseTotalsByBlockedId.get(trip.id) || 0;
                      const net = trip.revenue - tripCosts;
                      const isPartialRange =
                        trip.fullRevenue > 0 &&
                        Math.abs(trip.revenue - trip.fullRevenue) > 0.01;
                      return (
                        <div
                          key={trip.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-xl bg-teal-50/80 border border-teal-100"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {vehicle ? getVehicleDisplayName(vehicle) : trip.vehicle_id}
                            </p>
                            <p className="text-xs text-gray-600">
                              {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
                            </p>
                            {trip.revenue <= 0 && (
                              <p className="text-[11px] text-amber-700 mt-0.5">No payout parsed — check blocked date reason text</p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
                            <div className="text-right text-xs sm:text-sm">
                              <span className="text-gray-500">Revenue </span>
                              <span className="font-semibold text-green-700">${trip.revenue.toFixed(2)}</span>
                              {isPartialRange && (
                                <span className="text-gray-400 text-[11px] ml-1">
                                  (of ${trip.fullRevenue.toFixed(2)} trip)
                                </span>
                              )}
                              <span className="text-gray-400 mx-1">·</span>
                              <span className="text-gray-500">Costs </span>
                              <span className="font-semibold text-red-600">${tripCosts.toFixed(2)}</span>
                              <span className="text-gray-400 mx-1">·</span>
                              <span className="text-gray-500">Net </span>
                              <span className={`font-bold ${net >= 0 ? "text-teal-800" : "text-red-700"}`}>${net.toFixed(2)}</span>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-xs border-teal-300 text-teal-800 hover:bg-teal-100"
                              onClick={() => {
                                setNewExpense({
                                  vehicleId: trip.vehicle_id,
                                  blockedDateId: trip.id,
                                  category: "fuel",
                                  amount: "",
                                  description: "",
                                  date: trip.start_date,
                                });
                                setActiveTab("expenses");
                                setAddingExpense(true);
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add expense
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detailed Bookings List */}
            <Card className="rounded-2xl">
              <CardContent className="p-4 sm:p-5">
                <SectionHeader
                  title="Bookings"
                  subtitle={`${revenueBookings.length} bookings in range — tap to view vehicle`}
                />
                {revenueBookings.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No revenue bookings found</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {revenueBookings
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((booking) => {
                        const vehicle = vehicleMap.get(booking.vehicle_id);
                        const rangeRevenue = prorateBookingRevenueInRange(
                          booking.total_price ?? 0,
                          booking.pickup_date,
                          booking.return_date,
                          dateRange.from,
                          dateRange.to
                        );
                        const isPartialRange =
                          (booking.total_price ?? 0) > 0 &&
                          Math.abs(rangeRevenue - (booking.total_price ?? 0)) > 0.01;
                        return (
                          <div
                            key={booking.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer admin-card-press"
                            onClick={() => vehicle && setSelectedVehicleId(vehicle.id)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 bg-green-500">
                                  <DollarSign className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">
                                    {vehicle ? getVehicleDisplayName(vehicle) : "Unknown Vehicle"}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(booking.pickup_date)} – {formatDate(booking.return_date)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div>
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${
                                    booking.status === "completed"
                                      ? "bg-green-100 text-green-700"
                                      : booking.status === "active"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {booking.status}
                                </Badge>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-green-600 whitespace-nowrap">
                                  ${rangeRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                {isPartialRange && (
                                  <p className="text-[11px] text-gray-400 whitespace-nowrap">
                                    of ${(booking.total_price ?? 0).toLocaleString()} trip
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
  );
}

export default RevenueTab;
