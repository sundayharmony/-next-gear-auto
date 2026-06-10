"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "../finances-shared";
import type { FinancesTabProps } from "../finances-tab-types";

export function VehiclesTab({ vehicleAnalytics, setSelectedVehicleId }: FinancesTabProps) {
  return (
          <div className="space-y-4">
            <SectionHeader
              title="Fleet Performance"
              subtitle="Click any vehicle for full financial breakdown"
            />
            {vehicleAnalytics.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-12">No vehicles found</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicleAnalytics.map((v, idx) => (
                  <Card
                    key={v.id}
                    className="cursor-pointer hover:shadow-lg hover:border-purple-200 transition-all rounded-2xl admin-card-press"
                    onClick={() => setSelectedVehicleId(v.id)}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-bold text-gray-900">{v.name}</p>
                          <p className="text-xs text-gray-500">{v.bookings} bookings · {v.bookedDays} days</p>
                        </div>
                        <div className={`text-xs font-bold px-2 py-1 rounded-full ${idx === 0 ? "bg-yellow-100 text-yellow-700" : idx === 1 ? "bg-gray-100 text-gray-600" : idx === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-50 text-gray-400"}`}>
                          #{idx + 1}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-lg font-bold text-green-600">${v.revenue.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">Revenue</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-red-500">${v.expenses.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">Expenses</p>
                        </div>
                        <div>
                          <p className={`text-lg font-bold ${v.profit >= 0 ? "text-purple-600" : "text-red-600"}`}>
                            ${v.profit.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">Profit</p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Occupancy</span>
                          <span>{v.occupancy.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${v.occupancy >= 60 ? "bg-green-500" : v.occupancy >= 30 ? "bg-amber-500" : "bg-red-400"}`}
                            style={{ width: `${v.occupancy}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
  );
}

export default VehiclesTab;
