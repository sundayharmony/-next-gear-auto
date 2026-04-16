"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  RefreshCw,
  Download,
  Plus,
  X,
  Check,
  Mail,
  Car,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SortField, SortOrder } from "../types";

interface VehicleOption {
  id: string;
  name: string;
}

interface BookingFiltersProps {
  statusFilter: string;
  onStatusChange: (status: string) => void;
  vehicleFilter: string;
  onVehicleChange: (vehicle: string) => void;
  vehicleOptions: VehicleOption[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortField: SortField;
  sortOrder: SortOrder;
  bookingCount: number;
  loading: boolean;
  onRefresh: () => void;
  onExportCSV: () => void;
  onCreateNew: () => void;
  selectedCount: number;
  onBulkConfirm: () => void;
  onBulkStart: () => void;
  onBulkComplete: () => void;
  onBulkCancel: () => void;
  onBulkEmail: () => void;
  onClearSelection: () => void;
  bulkUpdating: boolean;
  capabilities?: {
    canExportCsv: boolean;
    canBulkUpdate: boolean;
    canBulkEmail: boolean;
    canCreateBookings: boolean;
  };
  /** Manager feed only includes active/upcoming trips — hide terminal status pills. */
  statusFilterPreset?: "admin" | "manager";
}

const STATUSES_ADMIN = ["all", "pending", "confirmed", "active", "completed", "cancelled"] as const;
const STATUSES_MANAGER = ["all", "pending", "confirmed", "active"] as const;

export default function BookingFilters({
  statusFilter,
  onStatusChange,
  vehicleFilter,
  onVehicleChange,
  vehicleOptions,
  searchQuery,
  onSearchChange,
  bookingCount,
  loading,
  onRefresh,
  onExportCSV,
  onCreateNew,
  selectedCount,
  onBulkConfirm,
  onBulkStart,
  onBulkComplete,
  onBulkCancel,
  onBulkEmail,
  onClearSelection,
  bulkUpdating,
  capabilities,
  statusFilterPreset = "admin",
}: BookingFiltersProps) {
  const canExportCsv = capabilities?.canExportCsv ?? true;
  const canBulkUpdate = capabilities?.canBulkUpdate ?? true;
  const canBulkEmail = capabilities?.canBulkEmail ?? true;
  const canCreateBookings = capabilities?.canCreateBookings ?? true;
  const statusPills = statusFilterPreset === "manager" ? STATUSES_MANAGER : STATUSES_ADMIN;
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [localSearch, onSearchChange]);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  return (
    <div className="space-y-4">
      {/* Status filter pills — horizontal scroll on mobile, wrap on desktop */}
      <div className="flex gap-2 overflow-x-auto sm:flex-wrap pb-1 sm:pb-0 -mx-1 px-1 scrollbar-hide" role="group" aria-label="Filter bookings by status">
        {statusPills.map((status) => (
          <button
            key={status}
            onClick={() => onStatusChange(status)}
            aria-pressed={statusFilter === status}
            aria-label={`Filter by ${status} status${statusFilter === status ? " (current)" : ""}`}
            className={`px-4 py-2 rounded-full font-medium text-sm transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 outline-none ${
              statusFilter === status
                ? "bg-purple-600 text-white focus-visible:outline-purple-700"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 focus-visible:outline-purple-600"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Search bar + vehicle filter + actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search input — full width on mobile */}
        <div className="flex-1 relative">
          <label htmlFor="search-input" className="sr-only">Search bookings</label>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" aria-hidden="true" />
          <Input
            id="search-input"
            type="text"
            placeholder="Search by customer name, email, phone..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-10 focus-visible:outline-2 focus-visible:outline-purple-600 focus-visible:outline-offset-0"
            aria-label="Search bookings by customer name, email, or phone"
          />
        </div>

        {/* Vehicle filter + action buttons — wrap on mobile */}
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex-1 sm:flex-none">
            <label htmlFor="vehicle-filter" className="sr-only">Filter by vehicle</label>
            <Select
              id="vehicle-filter"
              value={vehicleFilter}
              onChange={(e) => onVehicleChange(e.target.value)}
              aria-label="Filter by vehicle"
              icon={<Car className="w-4 h-4" />}
            >
              <option value="all">All Vehicles</option>
              {vehicleOptions.map((v) => (
                <option key={v.id} value={v.name}>{v.name}</option>
              ))}
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh bookings"
            aria-label="Refresh bookings"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          {canExportCsv && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportCSV}
              disabled={loading}
              title="Export as CSV"
              aria-label="Export as CSV"
            >
              <Download className="w-4 h-4" />
            </Button>
          )}
          {canCreateBookings && (
            <Button
              onClick={onCreateNew}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">New Booking</span>
            </Button>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedCount > 0 && (canBulkUpdate || canBulkEmail) && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 rounded-lg">
          <span className="text-sm font-medium text-purple-900">
            {selectedCount} selected
          </span>
          <div className="flex-1" />
          {canBulkUpdate && (
            <>
              <button
                onClick={onBulkConfirm}
                disabled={bulkUpdating}
                title="Confirm selected bookings"
                aria-label={`Confirm ${selectedCount} selected booking${selectedCount !== 1 ? "s" : ""}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-purple-700 rounded-full hover:bg-purple-100 active:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                Confirm
              </button>
              <button
                onClick={onBulkStart}
                disabled={bulkUpdating}
                title="Start selected bookings"
                aria-label={`Start ${selectedCount} selected booking${selectedCount !== 1 ? "s" : ""}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-purple-700 rounded-full hover:bg-purple-100 active:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                Start
              </button>
              <button
                onClick={onBulkComplete}
                disabled={bulkUpdating}
                title="Complete selected bookings"
                aria-label={`Complete ${selectedCount} selected booking${selectedCount !== 1 ? "s" : ""}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-purple-700 rounded-full hover:bg-purple-100 active:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                Complete
              </button>
              <button
                onClick={onBulkCancel}
                disabled={bulkUpdating}
                title="Cancel selected bookings"
                aria-label={`Cancel ${selectedCount} selected booking${selectedCount !== 1 ? "s" : ""}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 rounded-full hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" aria-hidden="true" />
                Cancel
              </button>
            </>
          )}
          {canBulkEmail && (
            <button
              onClick={onBulkEmail}
              disabled={bulkUpdating}
              title="Send email to selected"
              aria-label={`Send email to ${selectedCount} selected booking${selectedCount !== 1 ? "s" : ""}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-purple-700 rounded-full hover:bg-purple-100 active:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mail className="w-4 h-4" aria-hidden="true" />
              Email
            </button>
          )}
          <button
            onClick={onClearSelection}
            disabled={bulkUpdating}
            title="Clear selection"
            aria-label="Clear selection"
            className="inline-flex items-center p-1.5 text-gray-500 rounded-full hover:bg-gray-200 active:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-gray-600">
        <span className="font-medium">{bookingCount} bookings</span>
        {statusFilter === "all" && statusFilterPreset === "admin" && (
          <span className="ml-2">(cancelled trips hidden)</span>
        )}
        {statusFilter === "all" && statusFilterPreset === "manager" && (
          <span className="ml-2">(completed and cancelled not in this list)</span>
        )}
      </div>
    </div>
  );
}
