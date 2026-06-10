"use client";

import { Search, Filter, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { VehicleCategory } from "@/lib/types";

const CATEGORIES: VehicleCategory[] = [
  "compact",
  "sedan",
  "suv",
  "truck",
  "luxury",
  "van",
];

interface VehicleFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterCategory: VehicleCategory | "";
  onCategoryChange: (value: VehicleCategory | "") => void;
  onRefresh: () => void;
  loading: boolean;
  totalCount: number;
  filteredCount: number;
}

export function VehicleFilters({
  searchQuery,
  onSearchChange,
  filterCategory,
  onCategoryChange,
  onRefresh,
  loading,
  totalCount,
  filteredCount,
}: VehicleFiltersProps) {
  return (
    <>
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by make, model, color, plate, or VIN..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search vehicles"
            className="pl-10 pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <Select
            value={filterCategory}
            onChange={(e) => onCategoryChange(e.target.value as VehicleCategory | "")}
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="whitespace-nowrap"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {(searchQuery || filterCategory) && (
        <p className="text-sm text-gray-500 mb-4">
          Showing {filteredCount} of {totalCount} vehicle{totalCount !== 1 ? "s" : ""}
          {searchQuery && <> matching &ldquo;{searchQuery}&rdquo;</>}
          {filterCategory && (
            <> in <span className="font-medium capitalize">{filterCategory}</span></>
          )}
        </p>
      )}
    </>
  );
}
