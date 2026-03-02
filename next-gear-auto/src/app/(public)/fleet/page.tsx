"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Car, Users, Briefcase, Fuel, SlidersHorizontal, ArrowUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/layout/page-container";
import vehicles from "@/data/vehicles.json";
import { VEHICLE_CATEGORIES } from "@/lib/constants";

type SortOption = "price-low" | "price-high" | "name";

export default function FleetPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("price-low");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVehicles = useMemo(() => {
    let result = vehicles;

    if (activeCategory !== "all") {
      result = result.filter((v) => v.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.name.toLowerCase().includes(query) ||
          v.category.toLowerCase().includes(query) ||
          v.description.toLowerCase().includes(query)
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
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [activeCategory, sortBy, searchQuery]);

  return (
    <>
      {/* Page Header */}
      <section className="bg-gradient-to-br from-purple-900 to-gray-900 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold">Our Fleet</h1>
          <p className="mt-2 text-lg text-purple-200">
            Choose from our selection of well-maintained vehicles for any occasion.
          </p>
        </div>
      </section>

      <PageContainer className="py-8">
        {/* Filters */}
        <div className="mb-8 space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search vehicles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Category filters */}
            <div className="flex flex-wrap gap-2">
              {VEHICLE_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    activeCategory === cat.value
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
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
            <h3 className="text-lg font-semibold text-gray-700">No vehicles found</h3>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or search query.</p>
            <Button variant="outline" className="mt-4" onClick={() => { setActiveCategory("all"); setSearchQuery(""); }}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredVehicles.map((vehicle) => (
              <Link key={vehicle.id} href={`/fleet/${vehicle.id}`}>
                <Card className="group h-full card-hover">
                  {/* Image placeholder */}
                  <div className="relative aspect-[16/10] overflow-hidden rounded-t-xl bg-gradient-to-br from-purple-50 to-gray-100">
                    <div className="flex h-full items-center justify-center">
                      <Car className="h-20 w-20 text-purple-200 transition-all duration-300 group-hover:text-purple-400 group-hover:scale-110" />
                    </div>
                    <Badge className="absolute top-3 left-3">{vehicle.category}</Badge>
                    {vehicle.isAvailable ? (
                      <Badge className="absolute top-3 right-3 bg-green-100 text-green-700 border-green-200">Available</Badge>
                    ) : (
                      <Badge className="absolute top-3 right-3 bg-red-100 text-red-700 border-red-200">Unavailable</Badge>
                    )}
                  </div>

                  <CardContent className="p-5">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                      {vehicle.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{vehicle.description}</p>

                    {/* Specs */}
                    <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {vehicle.specs.passengers} seats
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" /> {vehicle.specs.luggage} bags
                      </span>
                      <span className="flex items-center gap-1">
                        <Fuel className="h-3.5 w-3.5" /> {vehicle.specs.mpg} mpg
                      </span>
                    </div>

                    {/* Pricing */}
                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                      <div>
                        <span className="text-2xl font-bold text-purple-600">${vehicle.dailyRate}</span>
                        <span className="text-sm text-gray-400">/day</span>
                      </div>
                      <Button size="sm">View Details</Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </PageContainer>
    </>
  );
}
