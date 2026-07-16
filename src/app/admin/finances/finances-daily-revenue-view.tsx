"use client";

import React from "react";
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  Car,
} from "lucide-react";
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
import {
  AdminPageHeader,
  AdminPageBody,
  AdminCard,
  AdminSection,
} from "@/components/admin/admin-shell";
import { formatDate } from "@/lib/utils/date-helpers";
import { StatCard } from "./finances-shared";
import type { FinanceBooking } from "./use-finances-data";

interface DailyRevenueDay {
  date: string;
  revenue: number;
  bookingCount: number;
  bookings?: FinanceBooking[];
}

interface FinancesDailyRevenueViewProps {
  allTimeDailyRevenue: DailyRevenueDay[];
  onBack: () => void;
}

export function FinancesDailyRevenueView({
  allTimeDailyRevenue,
  onBack,
}: FinancesDailyRevenueViewProps) {
  const totalAllTime = allTimeDailyRevenue.reduce((s, d) => s + d.revenue, 0);
  const totalBookings = allTimeDailyRevenue.reduce((s, d) => s + d.bookingCount, 0);
  const avgPerDay = allTimeDailyRevenue.length > 0 ? totalAllTime / allTimeDailyRevenue.length : 0;
  const bestDay =
    allTimeDailyRevenue.length > 0
      ? allTimeDailyRevenue.reduce((best, d) => (d.revenue > best.revenue ? d : best), allTimeDailyRevenue[0])
      : null;

  return (
    <>
      <AdminPageHeader
        title="Daily Revenue"
        subtitle="Day-by-day revenue breakdown — all time"
        onBack={onBack}
        backLabel="Back to finances"
      />
      <AdminPageBody>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Total Revenue"
            value={`$${totalAllTime.toLocaleString()}`}
            icon={<DollarSign className="h-4 w-4" />}
            accent="green"
          />
          <StatCard
            label="Total Bookings"
            value={`${totalBookings}`}
            icon={<Car className="h-4 w-4" />}
            accent="blue"
          />
          <StatCard
            label="Avg / Day"
            value={`$${Math.round(avgPerDay).toLocaleString()}`}
            icon={<BarChart3 className="h-4 w-4" />}
            accent="purple"
          />
          <StatCard
            label="Best Day"
            value={bestDay ? `$${bestDay.revenue.toLocaleString()}` : "$0"}
            subtext={bestDay ? formatDate(bestDay.date) : ""}
            icon={<TrendingUp className="h-4 w-4" />}
            accent="amber"
          />
        </div>

        <AdminSection
          title="Revenue Over Time"
          description={`${allTimeDailyRevenue.length} days with revenue`}
        >
          <AdminCard>
            <div className="h-52 sm:h-64 lg:h-72">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart
                  data={[...allTimeDailyRevenue].reverse().slice(-30)}
                  margin={{ top: 10, right: 20, bottom: 5, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(d) => {
                      if (!d) return "";
                      const parts = d.split("-").map(Number);
                      if (parts.length < 3 || parts.some(isNaN)) return d;
                      const [y, m, day] = parts;
                      return new Date(y, m - 1, day).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    }}
                    interval={Math.max(0, Math.floor(Math.min(30, allTimeDailyRevenue.length) / 8))}
                  />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
                    labelFormatter={(d) => {
                      if (!d) return "";
                      const parts = d.split("-").map(Number);
                      if (parts.length < 3 || parts.some(isNaN)) return d;
                      const [y, m, day] = parts;
                      return new Date(y, m - 1, day).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                    }}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                  />
                  <Bar dataKey="revenue" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AdminCard>
        </AdminSection>

        <AdminSection title="All Revenue by Day" description={`${allTimeDailyRevenue.length} days`}>
          <AdminCard>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wider">
                    <th scope="col" className="pb-3 font-medium">
                      Date
                    </th>
                    <th scope="col" className="pb-3 font-medium text-center">
                      Bookings
                    </th>
                    <th scope="col" className="pb-3 font-medium text-right">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {allTimeDailyRevenue.map((day) => (
                    <tr key={day.date} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 font-medium text-gray-900">
                        {new Date(day.date + "T00:00:00").toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 text-center">
                        <Badge variant="secondary" className="text-xs">
                          {day.bookingCount}
                        </Badge>
                      </td>
                      <td className="py-3 text-right font-bold text-green-600">
                        ${day.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200">
                    <td className="py-3 font-bold text-gray-900">Total</td>
                    <td className="py-3 text-center font-bold">{totalBookings}</td>
                    <td className="py-3 text-right font-bold text-green-600">
                      ${totalAllTime.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </AdminCard>
        </AdminSection>
      </AdminPageBody>
    </>
  );
}
