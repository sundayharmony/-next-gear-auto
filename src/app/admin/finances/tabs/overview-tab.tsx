"use client";

import React from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Car,
  Target,
  Receipt,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Line,
  CartesianGrid,
  Area,
  AreaChart,
  ComposedChart,
} from "recharts";
import {
  StatCard,
  SectionHeader,
  fmtCurrency,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
} from "../finances-shared";
import type { FinancesTabProps } from "../finances-tab-types";

export function OverviewTab({
  summaryData,
  cashFlowData,
  dailyEarningsData,
  expenseCategoryData,
  vehicleAnalytics,
  vehicles,
  setActiveTab,
  setSelectedVehicleId,
  setShowDailyRevenue,
}: FinancesTabProps) {
  return (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
              <StatCard
                label="Total Revenue"
                value={fmtCurrency(summaryData.totalRevenue)}
                icon={<DollarSign className="h-4 w-4" />}
                accent="green"
                trend={summaryData.totalRevenue > 0 ? "up" : "neutral"}
                onClick={() => setActiveTab("revenue")}
              />
              <StatCard
                label="Total Expenses"
                value={fmtCurrency(summaryData.totalExpenses)}
                icon={<Receipt className="h-4 w-4" />}
                accent="red"
                onClick={() => setActiveTab("expenses")}
              />
              <StatCard
                label="Net Profit"
                value={fmtCurrency(summaryData.netProfit)}
                icon={summaryData.netProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                accent={summaryData.netProfit >= 0 ? "purple" : "red"}
                trend={summaryData.netProfit > 0 ? "up" : summaryData.netProfit < 0 ? "down" : "neutral"}
                subtext={`${summaryData.profitMargin.toFixed(1)}% margin`}
                onClick={() => setActiveTab("profit")}
              />
              <StatCard
                label="Fleet Occupancy"
                value={`${summaryData.occupancyRate.toFixed(0)}%`}
                icon={<Target className="h-4 w-4" />}
                accent="blue"
                subtext={`${vehicles.length} vehicles`}
                onClick={() => setActiveTab("vehicles")}
              />
              <StatCard
                label="Bookings"
                value={`${summaryData.totalBookings}`}
                icon={<Car className="h-4 w-4" />}
                accent="amber"
                subtext={`${summaryData.totalBookedDays} days booked`}
                onClick={() => setActiveTab("vehicles")}
              />
              <StatCard
                label="Avg. Booking"
                value={fmtCurrency(summaryData.avgBookingValue)}
                icon={<BarChart3 className="h-4 w-4" />}
                accent="gray"
                onClick={() => setActiveTab("vehicles")}
              />
            </div>

            {/* Cash Flow Chart */}
            <Card className="cursor-pointer hover:shadow-lg hover:border-purple-200 transition-all admin-card-press rounded-2xl" onClick={() => setActiveTab("expenses")}>
              <CardContent className="p-4 sm:p-5">
                <SectionHeader
                  title="Cash Flow"
                  subtitle="Monthly income vs. expenses — click for details"
                />
                {cashFlowData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <BarChart3 className="h-8 w-8 mb-2" />
                    <p className="text-sm">No data for the selected date range</p>
                  </div>
                ) : (
                <div className="h-52 sm:h-64 lg:h-72">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <ComposedChart data={cashFlowData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        formatter={(value, name) => [`$${Number(value).toLocaleString()}`, name === "income" ? "Income" : name === "expenses" ? "Expenses" : "Net"]}
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                      />
                      <Legend verticalAlign="top" height={36} formatter={(value) => String(value).charAt(0).toUpperCase() + String(value).slice(1)} />
                      <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="Income" />
                      <Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} name="Expenses" />
                      <Line type="monotone" dataKey="net" stroke="#7C3AED" strokeWidth={2} dot={{ r: 4 }} name="Net" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                )}
              </CardContent>
            </Card>

            {/* Daily Revenue + Expense Breakdown side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily revenue */}
              <Card className="cursor-pointer hover:shadow-lg hover:border-purple-200 transition-all admin-card-press rounded-2xl" onClick={() => setShowDailyRevenue(true)}>
                <CardContent className="p-4 sm:p-5">
                  <SectionHeader title="Daily Revenue" subtitle={`Last ${Math.min(30, dailyEarningsData.length)} days — click for full breakdown`} />
                  {dailyEarningsData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <DollarSign className="h-8 w-8 mb-2" />
                      <p className="text-sm">No revenue data for the selected date range</p>
                    </div>
                  ) : (
                  <div className="h-40 sm:h-52 lg:h-64">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <AreaChart data={dailyEarningsData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                        <defs>
                          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          formatter={(value, name) => [
                            `$${Number(value).toLocaleString()}`,
                            name === "revenue" ? "Revenue" : "Expenses",
                          ]}
                          contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                        />
                        <Area type="monotone" dataKey="expenses" stroke="#EF4444" fill="url(#expenseGradient)" strokeWidth={1.5} />
                        <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="url(#revenueGradient)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  )}
                </CardContent>
              </Card>

              {/* Expense categories */}
              <Card className="cursor-pointer hover:shadow-lg hover:border-purple-200 transition-all admin-card-press rounded-2xl" onClick={() => setActiveTab("expenses")}>
                <CardContent className="p-4 sm:p-5">
                  <SectionHeader
                    title="Expense Categories"
                    subtitle={`${fmtCurrency(summaryData.totalExpenses)} total — tap for details`}
                  />
                  {expenseCategoryData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                      <Receipt className="h-8 w-8 mb-2" />
                      <p className="text-sm">No expenses recorded</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="h-56 sm:h-64">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                          <PieChart>
                            <Pie
                              data={expenseCategoryData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={85}
                              paddingAngle={3}
                              strokeWidth={2}
                              stroke="#fff"
                            >
                              {expenseCategoryData.map((entry) => (
                                <Cell key={entry.key} fill={CATEGORY_COLORS[entry.key] || "#6B7280"} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value) => [fmtCurrency(Number(value)), "Amount"]}
                              contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {expenseCategoryData.map((cat) => {
                          const pct = summaryData.totalExpenses > 0
                            ? ((cat.value / summaryData.totalExpenses) * 100).toFixed(1)
                            : "0";
                          return (
                            <div key={cat.key} className="flex items-center gap-2.5 text-sm">
                              <div
                                className="w-7 h-7 rounded-md flex items-center justify-center text-white shrink-0"
                                style={{ backgroundColor: CATEGORY_COLORS[cat.key] || "#6B7280" }}
                              >
                                {CATEGORY_ICONS[cat.key] || <MoreHorizontal className="h-3 w-3" />}
                              </div>
                              <span className="flex-1 truncate font-medium">{cat.name}</span>
                              <span className="text-gray-500 text-xs">{pct}%</span>
                              <span className="font-semibold tabular-nums">{fmtCurrency(cat.value)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Vehicle Profitability Rankings */}
            <Card>
              <CardContent className="p-4 sm:p-5">
                <SectionHeader
                  title="Vehicle Profitability"
                  subtitle="Ranked by profit — tap to view details"
                />
                {vehicleAnalytics.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No vehicles found</p>
                ) : (
                  <>
                    {/* Mobile: Card-based view */}
                    <div className="space-y-2.5 sm:hidden">
                      {vehicleAnalytics.map((v, idx) => (
                        <div
                          key={v.id}
                          onClick={() => setSelectedVehicleId(v.id)}
                          className="bg-gray-50 rounded-xl p-3.5 cursor-pointer active:bg-purple-50 transition-colors admin-card-press"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedVehicleId(v.id); } }}
                          aria-label={`View details for ${v.name}`}
                        >
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${idx === 0 ? "bg-yellow-100 text-yellow-700" : idx === 1 ? "bg-gray-200 text-gray-600" : idx === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-400"}`}>
                                {idx + 1}
                              </span>
                              <p className="font-semibold text-gray-900 text-sm truncate">{v.name}</p>
                            </div>
                            <span className="text-xs text-gray-500 shrink-0">{v.bookings} bookings</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-white rounded-lg py-1.5">
                              <p className="text-sm font-bold text-green-600">${v.revenue.toLocaleString()}</p>
                              <p className="text-[10px] text-gray-400">Revenue</p>
                            </div>
                            <div className="bg-white rounded-lg py-1.5">
                              <p className="text-sm font-bold text-red-500">${v.expenses.toLocaleString()}</p>
                              <p className="text-[10px] text-gray-400">Expenses</p>
                            </div>
                            <div className="bg-white rounded-lg py-1.5">
                              <p className={`text-sm font-bold ${v.profit >= 0 ? "text-purple-600" : "text-red-600"}`}>${v.profit.toLocaleString()}</p>
                              <p className="text-[10px] text-gray-400">Profit</p>
                            </div>
                          </div>
                          <div className="mt-2.5">
                            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                              <span>Occupancy</span>
                              <span className="font-medium">{v.occupancy.toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${v.occupancy >= 60 ? "bg-green-500" : v.occupancy >= 30 ? "bg-amber-500" : "bg-red-400"}`}
                                style={{ width: `${v.occupancy}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {/* Fleet total card */}
                      <div className="bg-purple-50 border border-purple-100 rounded-xl p-3.5">
                        <p className="text-xs font-semibold text-purple-700 mb-2">Fleet Total</p>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-sm font-bold text-green-600">{fmtCurrency(vehicleAnalytics.reduce((s, v) => s + v.revenue, 0))}</p>
                            <p className="text-[10px] text-gray-500">Revenue</p>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-red-500">{fmtCurrency(vehicleAnalytics.reduce((s, v) => s + v.expenses, 0))}</p>
                            <p className="text-[10px] text-gray-500">Expenses</p>
                          </div>
                          <div>
                            <p className={`text-sm font-bold ${vehicleAnalytics.reduce((s, v) => s + v.profit, 0) >= 0 ? "text-purple-600" : "text-red-600"}`}>{fmtCurrency(vehicleAnalytics.reduce((s, v) => s + v.profit, 0))}</p>
                            <p className="text-[10px] text-gray-500">Profit</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Desktop: Table view */}
                    <div className="hidden sm:block overflow-x-auto mt-1">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2 border-gray-200 text-left text-gray-500 text-xs uppercase tracking-wider">
                            <th scope="col" className="pb-3 pl-3 font-semibold w-10">#</th>
                            <th scope="col" className="pb-3 font-semibold">Vehicle</th>
                            <th scope="col" className="pb-3 font-semibold text-center">Bookings</th>
                            <th scope="col" className="pb-3 font-semibold text-right">Revenue</th>
                            <th scope="col" className="pb-3 font-semibold text-right">Expenses</th>
                            <th scope="col" className="pb-3 font-semibold text-right">Profit</th>
                            <th scope="col" className="pb-3 pr-3 font-semibold text-right w-44">Occupancy</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {vehicleAnalytics.map((v, idx) => (
                            <tr
                              key={v.id}
                              onClick={() => setSelectedVehicleId(v.id)}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedVehicleId(v.id); } }}
                              tabIndex={0}
                              role="button"
                              aria-label={`View details for ${v.name}`}
                              className="cursor-pointer hover:bg-purple-50 transition-colors focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-inset group"
                            >
                              <td className="py-3.5 pl-3">
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                                  idx === 0 ? "bg-yellow-100 text-yellow-700" :
                                  idx === 1 ? "bg-gray-200 text-gray-600" :
                                  idx === 2 ? "bg-orange-100 text-orange-700" :
                                  "bg-gray-100 text-gray-400"
                                }`}>{idx + 1}</span>
                              </td>
                              <td className="py-3.5 font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">{v.name}</td>
                              <td className="py-3.5 text-center text-gray-600">{v.bookings}</td>
                              <td className="py-3.5 text-right text-green-600 font-semibold">${v.revenue.toLocaleString()}</td>
                              <td className="py-3.5 text-right text-red-500 font-medium">${v.expenses.toLocaleString()}</td>
                              <td className={`py-3.5 text-right font-bold ${v.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                                ${v.profit.toLocaleString()}
                              </td>
                              <td className="py-3.5 pr-3 text-right">
                                <div className="flex items-center justify-end gap-2.5">
                                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        v.occupancy >= 60 ? "bg-green-500" :
                                        v.occupancy >= 30 ? "bg-amber-500" :
                                        v.occupancy > 0 ? "bg-red-400" : "bg-gray-200"
                                      }`}
                                      style={{ width: `${v.occupancy}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium text-gray-500 w-10 text-right">{v.occupancy.toFixed(0)}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-purple-200 bg-purple-50 font-bold">
                            <td className="py-3.5 pl-3">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 text-purple-600 text-xs font-bold">∑</span>
                            </td>
                            <td className="py-3.5 text-purple-900 font-bold">Fleet Total</td>
                            <td className="py-3.5 text-center text-purple-700">{vehicleAnalytics.reduce((s, v) => s + v.bookings, 0)}</td>
                            <td className="py-3.5 text-right text-green-600 font-bold">{fmtCurrency(vehicleAnalytics.reduce((s, v) => s + v.revenue, 0))}</td>
                            <td className="py-3.5 text-right text-red-500 font-bold">{fmtCurrency(vehicleAnalytics.reduce((s, v) => s + v.expenses, 0))}</td>
                            <td className={`py-3.5 text-right font-bold ${vehicleAnalytics.reduce((s, v) => s + v.profit, 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {fmtCurrency(vehicleAnalytics.reduce((s, v) => s + v.profit, 0))}
                            </td>
                            <td className="py-3.5 pr-3 text-right text-xs font-semibold text-purple-600">
                              {vehicleAnalytics.length > 0 ? (vehicleAnalytics.reduce((s, v) => s + v.occupancy, 0) / vehicleAnalytics.length).toFixed(0) : 0}% avg
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
  );
}

export default OverviewTab;
