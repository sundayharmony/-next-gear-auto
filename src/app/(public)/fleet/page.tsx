"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Car, Users, Briefcase, Fuel, ArrowUpDown, Search, GitCompareArrows, X, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/layout/page-container";
import { useComparison } from "@/lib/hooks/use-comparison";
import { useVehicles } from "@/lib/hooks/useVehicles";
import { VEHICLE_CATEGORIES } from "@/lib/constants";
import { getVehicleDisplayName } from "@/lib/types";
import { logger } from "@/lib/utils/logger";
import type { Vehicle } from "@/lib/types";

type SortOption = "price-low" | "price-high" | "name";

function FleetContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryParam = searchParams.get("category");

  const { vehicles, loading, error: vehicleError } = useVehicles();
  const [activeCategory, setActiveCategory] = useState(
    categoryParam && VEHICLE_CATEGORIES.some((c) => c.value === categoryParam)
      ? categoryParam
      : "all"
  );
  const [sortBy, setSortBy] = useState<SortOption>("price-low");
  const [searchQuery, setSearchQuery] = useState("");
  const comparison = useComparison();

  // Sync category when URL param changes
  useEffect(() => {
    if (categoryParam && VEHICLE_CATEGORIES.some((c) => c.value === categoryParam)) {
      setActiveCategory(categoryParam);
    }
  }, [categoryParam]);

  const filteredVehicles = useMemo(() => {
    let result = vehicles;

    if (activeCategory !== "all") {
      result = result.filter((v) => v.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (v) => {
          const displayName = getVehicleDisplayName(v).toLowerCase();
          return displayName.includes(query) ||
            v.make.toLowerCase().includes(query) ||
            v.model.toLowerCase().includes(query) ||
            v.category.toLowerCase().includes(query) ||
            v.description.toLowerCase().includes(query);
        }
      );
    }

    switch (sortBy) {
      case "price-low":
        result = [...result].sort((a, b) => a.dailyRate - b.dailyRate);
        break;
      case "price-high":
        result = [...result].sort((a, b) => b.dailyRate - a.dailyRate);
        break;
      case "name":
        result = [...result].sort((a, b) => getVehicleDisplayName(a).localeCompare(getVehicleDisplayName(b)));
        break;
    }

    return result;
  }, [vehicles, activeCategory, sortBy, searchQuery]);

  return (
    <>
      {/* Page Header */}
      <section className="bg-gradient-to-br from-purple-900 to-gray-900 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-4xl font-bold">Our Fleet</h1>
          <p className="mt-2 text-lg text-purple-200">
            Choose from our selection of well-maintained vehicles for any occasion.
          </p>
        </div>
      </section>

      <PageContainer className={`py-8 ${comparison.compareCount >= 2 ? "pb-24" : "pb-8"}`}>
        {/* Error state */}
        {vehicleError && (
          <div className="mb-8 rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-red-700 font-medium">{vehicleError}</p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-16" role="status" aria-live="polite" aria-label="Loading vehicles">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full" aria-hidden="true" />
              <p className="text-gray-500">Loading vehicles...</p>
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* Filters */}
            <div className="mb-8 space-y-4">
              {/* Search */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <Input
                  type="text"
                  placeholder="Search vehicles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search vehicles"
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Category filters */}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by vehicle category">
              {VEHICLE_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    activeCategory === cat.value
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  aria-pressed={activeCategory === cat.value}
                  aria-label={`Filter by ${cat.label} category`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <label htmlFor="sort-select" className="sr-only">Sort vehicles by</label>
              <ArrowUpDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                aria-label="Sort vehicles by"
              >
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Name: A-Z</option>
              </select>
            </div>
            </div>
            </div>

            {/* Results count */}
            <p className="mb-4 text-sm text-gray-500">
              Showing {filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? "s" : ""}
            </p>

        {/* Vehicle Grid */}
        {filteredVehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Car className="h-16 w-16 text-gray-300 mb-4" />
            <h2 className="text-lg font-semibold text-gray-700">No vehicles found</h2>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or search query.</p>
            <Button variant="outline" className="mt-4" onClick={() => { setActiveCategory("all"); setSearchQuery(""); }}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredVehicles.map((vehicle) => (
              <div key={vehicle.id} className="relative">
                {/* Compare checkbox */}
                <label
                  className="absolute top-3 right-2 sm:right-14 z-10 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-1 text-xs font-medium cursor-pointer shadow-sm border border-gray-200 hover:border-purple-300 transition-all duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={comparison.isComparing(vehicle.id)}
                    onChange={() => comparison.toggleCompare(vehicle.id)}
                    disabled={!comparison.isComparing(vehicle.id) && !comparison.canAddMore}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    aria-label={`Compare ${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                  />
                  Compare
                </label>

                <Link href={`/fleet/${vehicle.id}`}>
                  <Card className={`group h-full card-hover transition-shadow ${comparison.isComparing(vehicle.id) ? "ring-2 ring-purple-500" : ""}`}>
                    {/* Vehicle Image */}
                    <div className="relative aspect-[16/10] overflow-hidden rounded-t-xl bg-gradient-to-br from-purple-50 to-gray-100 animate-pulse">
                      {vehicle.images && vehicle.images.length > 0 ? (
                        <img
                          src={vehicle.images[0]}
                          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                          width={600}
                          height={400}
                          loading="eager"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onLoad={(e) => {
                            const imgElement = e.target as HTMLImageElement;
                            const parent = imgElement.parentElement;
                            if (parent) parent.classList.remove("animate-pulse");
                          }}
                          onError={(e) => {
                            const imgElement = e.target as HTMLImageElement;
                            imgElement.style.display = "none";
                            const parent = imgElement.parentElement;
                            if (parent && parent.querySelector(".fallback-icon") === null) {
                              const fallback = document.createElement("div");
                              fallback.className = "fallback-icon absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-50 to-gray-100";
                              const icon = document.createElement("div");
                              icon.innerHTML = '<svg class="h-20 w-20 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16h8m-4-4h4m-4-4h4m-10 8a2 2 0 100-4 2 2 0 000 4zm0-6a3 3 0 00-3 3v4a3 3 0 003 3h8a3 3 0 003-3v-4a3 3 0 00-3-3h-8z"></path></svg>';
                              fallback.appendChild(icon);
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Car className="h-20 w-20 text-purple-200 transition-all duration-300 group-hover:text-purple-400 group-hover:scale-110" />
                        </div>
                      )}
                      <Badge className="absolute top-3 left-3">{vehicle.category}</Badge>
                      {vehicle.isAvailable ? (
                        <Badge className="absolute bottom-3 right-3 bg-green-100 text-green-700 border-green-200">Available</Badge>
                      ) : (
                        <Badge className="absolute bottom-3 right-3 bg-red-100 text-red-700 border-red-200">Unavailable</Badge>
                      )}
                    </div>

                    <CardContent className="p-5">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">{vehicle.description}</p>

                      {/* Specs */}
                      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-purple-400" /> {vehicle.specs?.passengers ?? "—"} seats
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5 text-purple-400" /> {vehicle.specs?.luggage ?? "—"} bags
                        </span>
                        <span className="flex items-center gap-1">
                          <Fuel className="h-3.5 w-3.5 text-purple-400" /> {vehicle.specs?.fuelType || "Gas"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Settings2 className="h-3.5 w-3.5 text-purple-400" /> {vehicle.specs?.transmission || "Auto"}
                        </span>
                      </div>

                      {/* Pricing */}
                      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                        <div>
                          <span className="text-2xl font-bold text-purple-600">${vehicle.dailyRate.toFixed(2)}</span>
                          <span className="text-sm text-gray-500">/day</span>
                        </div>
                        <Button size="sm">View Details</Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        )}
            </>
        )}
      </PageContainer>

      {/* Floating Compare Bar */}
      {!loading && comparison.compareCount >= 2 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-purple-200 bg-white/95 backdrop-blur-sm shadow-lg">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GitCompareArrows className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">
                {comparison.compareCount} vehicles selected
              </span>
              <div className="hidden sm:flex gap-2">
                {comparison.compareIds.map((id) => {
                  const v = vehicles.find((v) => v.id === id);
                  return v ? (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700"
                    >
                      {v.year} {v.make} {v.model}
                      <button
                        onClick={() => comparison.removeFromCompare(id)}
                        aria-label={`Remove ${v.year} ${v.make} ${v.model} from comparison`}
                        className="hover:text-purple-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ) : null;
                }).filter(Boolean)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={comparison.clearComparison}
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  router.push(
                    `/fleet/comparison?ids=${comparison.compareIds.join(",")}`
                  )
                }
              >
                Compare Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function FleetPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24" role="status" aria-label="Loading fleet page">
          <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full" aria-hidden="true" />
        </div>
      }
    >
      <FleetContent />
    </Suspense>
  );
}
