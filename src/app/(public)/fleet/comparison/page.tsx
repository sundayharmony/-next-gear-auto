"use client";

import React, { Suspense, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Car, Users, Briefcase, Fuel, Gauge, DoorOpen, Settings,
  ArrowLeft, Check, X, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { useVehicles } from "@/lib/hooks/useVehicles";
import { logger } from "@/lib/utils/logger";
import type { Vehicle } from "@/lib/types";

function ComparisonContent() {
  const searchParams = useSearchParams();
  const ids = (searchParams.get("ids") || "").split(",").filter(Boolean);
  const { vehicles, loading } = useVehicles();

  const selectedVehicles = useMemo(
    () => ids.map((id) => vehicles.find((v) => v.id === id)).filter((v): v is Vehicle => Boolean(v)),
    [ids, vehicles]
  );

  if (loading) {
    return (
      <PageContainer className="py-16">
        <div className="flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
          <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full" aria-hidden="true" />
          <p className="text-sm text-gray-500">Loading comparison...</p>
        </div>
      </PageContainer>
    );
  }

  if (selectedVehicles.length < 2) {
    return (
      <>
        <section className="bg-gradient-to-br from-purple-900 to-gray-900 py-12 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold">Compare Vehicles</h1>
          </div>
        </section>
        <PageContainer className="py-16">
          <div className="text-center">
            <Car className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700">
              Select at least 2 vehicles to compare
            </h2>
            <p className="mt-2 text-gray-500">
              Go to the fleet page and use the compare checkboxes to select vehicles.
            </p>
            <Link href="/fleet">
              <Button className="mt-6 gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Fleet
              </Button>
            </Link>
          </div>
        </PageContainer>
      </>
    );
  }

  const specRows = [
    { label: "Category", icon: Car, getValue: (v: Vehicle) => v.category },
    { label: "Passengers", icon: Users, getValue: (v: Vehicle) => `${v.specs?.passengers ?? "N/A"} seats` },
    { label: "Luggage", icon: Briefcase, getValue: (v: Vehicle) => `${v.specs?.luggage ?? "N/A"} bags` },
    { label: "Transmission", icon: Settings, getValue: (v: Vehicle) => v.specs?.transmission ?? "N/A" },
    { label: "Fuel Type", icon: Fuel, getValue: (v: Vehicle) => v.specs?.fuelType ?? "N/A" },
    { label: "Fuel Economy", icon: Gauge, getValue: (v: Vehicle) => `${v.specs?.mpg ?? "N/A"} MPG` },
    { label: "Doors", icon: DoorOpen, getValue: (v: Vehicle) => `${v.specs?.doors ?? "N/A"}` },
  ];

  const priceRows = [
    { label: "Daily Rate", getValue: (v: Vehicle) => `$${v.dailyRate}` },
  ];

  // Collect all unique features
  const allFeatures = Array.from(
    new Set(selectedVehicles.flatMap((v) => v.features))
  ).sort();

  return (
    <>
      <section className="bg-gradient-to-br from-purple-900 to-gray-900 py-12 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/fleet"
            className="inline-flex items-center gap-1.5 text-sm text-purple-300 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Fleet
          </Link>
          <h1 className="text-3xl font-bold">Compare Vehicles</h1>
          <p className="mt-2 text-purple-200">
            Comparing {selectedVehicles.length} vehicles side by side
          </p>
        </div>
      </section>

      <PageContainer className="py-8">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            {/* Vehicle Headers */}
            <thead>
              <tr>
                <th className="w-40 p-3 text-left text-sm font-medium text-gray-500">
                  Vehicle
                </th>
                {selectedVehicles.map((v) => (
                  <th key={v.id} className="p-3 text-center">
                    <Link href={`/fleet/${v.id}`} className="group">
                      <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-xl overflow-hidden bg-purple-50 group-hover:bg-purple-100 transition-colors">
                        {v.images && v.images.length > 0 ? (
                          <img
                            src={v.images[0]}
                            alt={`${v.year} ${v.make} ${v.model}`}
                            width={80}
                            height={80}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Car className="h-10 w-10 text-purple-400" />
                        )}
                      </div>
                      <p className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                        {v.year} {v.make} {v.model}
                      </p>
                      <Badge className="mt-1">{v.category}</Badge>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Pricing Section */}
              <tr>
                <td
                  colSpan={selectedVehicles.length + 1}
                  className="px-3 pt-6 pb-2 text-sm font-semibold uppercase tracking-wider text-purple-600"
                >
                  Pricing
                </td>
              </tr>
              {priceRows.map((row) => {
                const lowestValue = Math.min(
                  ...selectedVehicles.map((v) =>
                    parseFloat((row.getValue(v) || "").replace("$", "").replace(",", "") || "0")
                  )
                );
                return (
                  <tr key={row.label} className="border-b border-gray-100">
                    <td className="p-3 text-sm text-gray-500">{row.label}</td>
                    {selectedVehicles.map((v) => {
                      const value = row.getValue(v) || "";
                      const numValue = parseFloat(value.replace("$", "").replace(",", "") || "0");
                      const isLowest = numValue <= lowestValue && numValue > 0;
                      return (
                        <td
                          key={v.id}
                          className={`p-3 text-center text-sm font-medium ${
                            isLowest ? "text-green-600 font-bold" : "text-gray-900"
                          }`}
                        >
                          {value}
                          {isLowest && selectedVehicles.length > 1 && (
                            <span className="ml-1 text-xs text-green-500">Best</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Specs Section */}
              <tr>
                <td
                  colSpan={selectedVehicles.length + 1}
                  className="px-3 pt-6 pb-2 text-sm font-semibold uppercase tracking-wider text-purple-600"
                >
                  Specifications
                </td>
              </tr>
              {specRows.map((row) => (
                <tr key={row.label} className="border-b border-gray-100">
                  <td className="p-3 text-sm text-gray-500 flex items-center gap-2">
                    <row.icon className="h-4 w-4 text-gray-500" />
                    {row.label}
                  </td>
                  {selectedVehicles.map((v) => (
                    <td key={v.id} className="p-3 text-center text-sm text-gray-900">
                      {row.getValue(v)}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Features Section */}
              <tr>
                <td
                  colSpan={selectedVehicles.length + 1}
                  className="px-3 pt-6 pb-2 text-sm font-semibold uppercase tracking-wider text-purple-600"
                >
                  Features
                </td>
              </tr>
              {allFeatures.map((feature) => (
                <tr key={feature} className="border-b border-gray-100">
                  <td className="p-3 text-sm text-gray-500">{feature}</td>
                  {selectedVehicles.map((v) => (
                    <td key={v.id} className="p-3 text-center">
                      {v.features.includes(feature) ? (
                        <>
                          <Check className="h-5 w-5 text-green-500 mx-auto" aria-hidden="true" />
                          <span className="sr-only">Included</span>
                        </>
                      ) : (
                        <>
                          <X className="h-5 w-5 text-gray-300 mx-auto" aria-hidden="true" />
                          <span className="sr-only">Not included</span>
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Book buttons */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {selectedVehicles.map((v) => (
            <Card key={v.id}>
              <CardContent className="p-4 text-center">
                <p className="font-semibold text-gray-900">{v.year} {v.make} {v.model}</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  ${v.dailyRate}<span className="text-sm text-gray-500">/day</span>
                </p>
                <Link href={`/booking?vehicleId=${v.id}`} className="block mt-3">
                  <Button className="w-full gap-2" size="sm">
                    <Calendar className="h-4 w-4" /> Book Now
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageContainer>
    </>
  );
}

export default function ComparisonPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <ComparisonContent />
    </Suspense>
  );
}
