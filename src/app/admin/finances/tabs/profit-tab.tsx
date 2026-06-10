"use client";

import React from "react";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ComposedChart,
  Line,
  Legend,
} from "recharts";
import { StatCard, SectionHeader, fmtCurrency } from "../finances-shared";
import type { FinancesTabProps } from "../finances-tab-types";

export function ProfitTab({ summaryData, monthlyProfitData }: FinancesTabProps) {
  return (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Total Revenue"
                value={fmtCurrency(summaryData.totalRevenue)}
                icon={<TrendingUp className="h-4 w-4" />}
                accent="green"
              />
              <StatCard
                label="Total Expenses"
                value={fmtCurrency(summaryData.totalExpenses)}
                icon={<TrendingDown className="h-4 w-4" />}
                accent="red"
              />
              <StatCard
                label="Net Profit"
                value={fmtCurrency(summaryData.netProfit)}
                icon={summaryData.netProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                accent={summaryData.netProfit >= 0 ? "purple" : "red"}
              />
              <StatCard
                label="Profit Margin"
                value={`${summaryData.profitMargin.toFixed(1)}%`}
                icon={<BarChart3 className="h-4 w-4" />}
                accent="blue"
              />
            </div>

            {/* Monthly Profit Trend Chart */}
            <Card className="rounded-2xl">
              <CardContent className="p-4 sm:p-5">
                <SectionHeader
                  title="Monthly Profit Trend"
                  subtitle="Revenue (green), Expenses (red), and Net Profit (blue line)"
                />
                <div className="h-56 sm:h-72 lg:h-80">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <ComposedChart data={monthlyProfitData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        formatter={(value, name) => [
                          `$${Number(value).toLocaleString()}`,
                          String(name).charAt(0).toUpperCase() + String(name).slice(1),
                        ]}
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                      />
                      <Bar dataKey="revenue" fill="#10B981" radius={[8, 8, 0, 0]} name="Revenue" />
                      <Bar dataKey="expenses" fill="#EF4444" radius={[8, 8, 0, 0]} name="Expenses" />
                      <Line type="monotone" dataKey="profit" stroke="#3B82F6" strokeWidth={2} dot={{ fill: "#3B82F6", r: 4 }} name="Profit" />
                      <Legend verticalAlign="top" height={36} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Breakdown */}
            <Card>
              <CardContent className="p-4 sm:p-5">
                <SectionHeader
                  title="Monthly Breakdown"
                  subtitle="Detailed profit analysis by month"
                />
                {/* Mobile: Card-based */}
                <div className="space-y-2.5 sm:hidden">
                  {monthlyProfitData.map((month) => (
                    <div key={month.date} className="bg-gray-50 rounded-xl p-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-900 text-sm">{month.month}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${month.revenue > 0 && month.profit >= 0 ? "bg-green-100 text-green-700" : month.revenue > 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
                          {month.revenue > 0 ? (Number.isFinite(month.profit / month.revenue) ? ((month.profit / month.revenue) * 100).toFixed(1) : "0") : "0"}%
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white rounded-lg py-1.5">
                          <p className="text-sm font-bold text-green-600">${month.revenue.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400">Revenue</p>
                        </div>
                        <div className="bg-white rounded-lg py-1.5">
                          <p className="text-sm font-bold text-red-500">${month.expenses.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400">Expenses</p>
                        </div>
                        <div className="bg-white rounded-lg py-1.5">
                          <p className={`text-sm font-bold ${month.profit >= 0 ? "text-purple-600" : "text-red-600"}`}>${month.profit.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400">Profit</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Total row */}
                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-3.5">
                    <p className="text-xs font-semibold text-purple-700 mb-2">Total</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-sm font-bold text-green-600">{fmtCurrency(monthlyProfitData.reduce((s, m) => s + m.revenue, 0))}</p>
                        <p className="text-[10px] text-gray-500">Revenue</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-red-500">{fmtCurrency(monthlyProfitData.reduce((s, m) => s + m.expenses, 0))}</p>
                        <p className="text-[10px] text-gray-500">Expenses</p>
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${summaryData.netProfit >= 0 ? "text-purple-600" : "text-red-600"}`}>{fmtCurrency(monthlyProfitData.reduce((s, m) => s + m.profit, 0))}</p>
                        <p className="text-[10px] text-gray-500">Profit</p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Desktop: Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th scope="col" className="text-left py-3 px-4 font-semibold text-gray-700">Month</th>
                        <th scope="col" className="text-right py-3 px-4 font-semibold text-gray-700">Revenue</th>
                        <th scope="col" className="text-right py-3 px-4 font-semibold text-gray-700">Expenses</th>
                        <th scope="col" className="text-right py-3 px-4 font-semibold text-gray-700">Profit</th>
                        <th scope="col" className="text-right py-3 px-4 font-semibold text-gray-700">Margin %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyProfitData.map((month) => (
                        <tr key={month.date} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-gray-700">{month.month}</td>
                          <td className="py-3 px-4 text-right text-green-600 font-medium">
                            ${month.revenue.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right text-red-600 font-medium">
                            ${month.expenses.toLocaleString()}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-semibold ${
                              month.profit >= 0 ? "text-purple-600" : "text-red-600"
                            }`}
                          >
                            ${month.profit.toLocaleString()}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-semibold ${
                              month.revenue > 0 && month.profit >= 0
                                ? "text-green-600"
                                : month.revenue > 0 && month.profit < 0
                                ? "text-red-600"
                                : "text-gray-500"
                            }`}
                          >
                            {month.revenue > 0 ? (Number.isFinite(month.profit / month.revenue) ? ((month.profit / month.revenue) * 100).toFixed(1) : "0") : "0"}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                        <td className="py-3 px-4 text-gray-900">Total</td>
                        <td className="py-3 px-4 text-right text-green-600">
                          {fmtCurrency(monthlyProfitData.reduce((s, m) => s + m.revenue, 0))}
                        </td>
                        <td className="py-3 px-4 text-right text-red-600">
                          {fmtCurrency(monthlyProfitData.reduce((s, m) => s + m.expenses, 0))}
                        </td>
                        <td className={`py-3 px-4 text-right ${summaryData.netProfit >= 0 ? "text-purple-600" : "text-red-600"}`}>
                          {fmtCurrency(monthlyProfitData.reduce((s, m) => s + m.profit, 0))}
                        </td>
                        <td className={`py-3 px-4 text-right ${summaryData.profitMargin >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {summaryData.profitMargin.toFixed(1)}%
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
  );
}

export default ProfitTab;
