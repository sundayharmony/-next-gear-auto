"use client";

import React from "react";
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Target,
  Calendar,
  Car,
  MoreHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AdminPageHeader,
  AdminPageBody,
  AdminCard,
  AdminSection,
  adminListItemClass,
} from "@/components/admin/admin-shell";
import { formatDate } from "@/lib/utils/date-helpers";
import { prorateBookingRevenueInRange } from "@/lib/finance/booking-proration";
import {
  StatCard,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
} from "./finances-shared";
import { getVehicleDetail } from "./use-finances-mutations";

type VehicleDetailData = NonNullable<ReturnType<typeof getVehicleDetail>>;

interface FinancesVehicleDetailProps {
  detail: VehicleDetailData;
  dateRange: { from: string; to: string };
  onBack: () => void;
}

export function FinancesVehicleDetail({ detail, dateRange, onBack }: FinancesVehicleDetailProps) {
  const {
    vehicle,
    bookings: vBookings,
    expenses: vExpenses,
    revenue,
    expenseTotal,
    effectiveCost,
    financingInfo,
    profit,
    roi,
    occupancy,
    bookedDays,
  } = detail;

  const catBreakdown: Record<string, number> = {};
  vExpenses.forEach((e) => {
    catBreakdown[e.category] = (catBreakdown[e.category] || 0) + (e.amount ?? 0);
  });

  return (
    <>
      <AdminPageHeader
        title={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
        subtitle="Vehicle Financial Breakdown"
        onBack={onBack}
        backLabel="Back to finances"
      />
      <AdminPageBody>
        <div className="page-hero-card p-4 sm:p-6 text-white">
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${financingInfo ? "md:grid-cols-4" : "md:grid-cols-3"} gap-4 sm:gap-6`}
          >
            <div>
              <p className="text-gray-300 text-xs font-medium uppercase tracking-wider">
                {vehicle.isFinanced ? "Vehicle Price" : "Purchase Price"}
              </p>
              <p className="text-2xl font-bold mt-1">${(vehicle.purchasePrice ?? 0).toLocaleString()}</p>
            </div>
            {financingInfo && (
              <>
                <div>
                  <p className="text-gray-300 text-xs font-medium uppercase tracking-wider">Monthly Payment</p>
                  <p className="text-2xl font-bold mt-1">${financingInfo.monthlyPayment.toLocaleString()}/mo</p>
                  <p className="text-gray-400 text-xs mt-1">{financingInfo.paymentsProcessed} payments made</p>
                </div>
                <div>
                  <p className="text-gray-300 text-xs font-medium uppercase tracking-wider">Paid So Far</p>
                  <p className="text-2xl font-bold mt-1">${financingInfo.totalPaid.toLocaleString()}</p>
                  <p className="text-gray-400 text-xs mt-1">${financingInfo.remainingBalance.toLocaleString()} remaining</p>
                </div>
              </>
            )}
            <div>
              <p className="text-gray-300 text-xs font-medium uppercase tracking-wider">ROI</p>
              <p className={`text-2xl font-bold mt-1 ${parseFloat(roi) >= 0 ? "text-green-400" : "text-red-400"}`}>
                {roi}%
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Revenue" value={`$${revenue.toLocaleString()}`} icon={<DollarSign className="h-4 w-4" />} accent="green" />
          <StatCard label="Expenses" value={`$${(expenseTotal + effectiveCost).toLocaleString()}`} icon={<Receipt className="h-4 w-4" />} accent="red" />
          <StatCard label="Profit" value={`$${profit.toLocaleString()}`} icon={<TrendingUp className="h-4 w-4" />} accent={profit >= 0 ? "green" : "red"} />
          <StatCard label="Occupancy" value={`${occupancy.toFixed(0)}%`} icon={<Target className="h-4 w-4" />} accent="blue" />
          <StatCard label="Booked Days" value={`${bookedDays}`} icon={<Calendar className="h-4 w-4" />} accent="purple" />
          <StatCard label="Bookings" value={`${vBookings.length}`} icon={<Car className="h-4 w-4" />} accent="amber" />
        </div>

        <AdminSection title="Booking History" description={`${vBookings.length} total bookings`}>
          <AdminCard>
            {vBookings.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No bookings found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th scope="col" className="pb-2 font-medium">Booking ID</th>
                      <th scope="col" className="pb-2 font-medium">Pickup</th>
                      <th scope="col" className="pb-2 font-medium">Return</th>
                      <th scope="col" className="pb-2 font-medium text-right">Amount</th>
                      <th scope="col" className="pb-2 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {vBookings
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((b) => {
                        const rangeRevenue = prorateBookingRevenueInRange(
                          b.total_price ?? 0,
                          b.pickup_date,
                          b.return_date,
                          dateRange.from,
                          dateRange.to
                        );
                        return (
                          <tr key={b.id} className="text-gray-700">
                            <td className="py-2.5 font-mono text-xs">{b.id.slice(0, 16)}...</td>
                            <td className="py-2.5">{formatDate(b.pickup_date)}</td>
                            <td className="py-2.5">{formatDate(b.return_date)}</td>
                            <td className="py-2.5 text-right font-semibold">
                              ${rangeRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 text-right">
                              <Badge variant="secondary" className="text-xs capitalize">{b.status}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>
        </AdminSection>

        <AdminSection title="Expense Breakdown">
          <AdminCard>
            {Object.keys(catBreakdown).length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No expenses recorded</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(catBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, amount]) => {
                    const total = Object.values(catBreakdown).reduce((s, v) => s + v, 0);
                    const pct = total > 0 ? (amount / total) * 100 : 0;
                    return (
                      <div key={cat} className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: CATEGORY_COLORS[cat] || "#6B7280" }}
                        >
                          {CATEGORY_ICONS[cat] || <MoreHorizontal className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium capitalize">{cat}</span>
                            <span className="font-semibold">${amount.toLocaleString()}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: CATEGORY_COLORS[cat] || "#6B7280",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </AdminCard>
        </AdminSection>

        <AdminSection title="Expense History" description={`${vExpenses.length} records`}>
          <AdminCard>
            {vExpenses.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No expenses</p>
            ) : (
              <div className="space-y-2">
                {vExpenses
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((exp) => (
                    <div key={exp.id} className={`${adminListItemClass} flex items-center gap-3`}>
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[exp.category] || "#6B7280" }}
                      >
                        {CATEGORY_ICONS[exp.category] || <MoreHorizontal className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize">{exp.category}</p>
                        {exp.description && (
                          <p className="text-xs text-gray-500 truncate">{exp.description}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">${exp.amount.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{formatDate(exp.date)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </AdminCard>
        </AdminSection>
      </AdminPageBody>
    </>
  );
}

export type { VehicleDetailData };
