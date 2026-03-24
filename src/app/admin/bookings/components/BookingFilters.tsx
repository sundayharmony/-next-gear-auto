"use client";

import React from "react";
import {
  Search,
  RefreshCw,
  Download,
  Plus,
  X,
  Check,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SortField, SortOrder } from "../types";

interface BookingFiltersProps {
  statusFilter: string;
  onStatusChange: (status: string) => void;
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
}

const statuses = ["all", "pending", "confirmed", "active", "completed", "cancelled"];

export default function BookingFilters({
  statusFilter,
  onStatusChange,
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
}: BookingFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map((status) => (
          <button
            key={status}
            onClick={() => onStatusChange(status)}
            className={`px-4 py-2 rounded-full font-medium text-sm transition-colors ${
              statusFilter === status
                ? "bg-purple-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Search bar + actions row */}
      <div className="flex gap-3 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search by customer name, email, phone..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
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
        <Button
          onClick={onCreateNew}
          size="sm"
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Booking
        </Button>
      </div>

      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-1 px-4 py-2 bg-purple-50 border border-purple-200 rounded-full">
          <span className="text-sm font-medium text-purple-900 mr-2">
            {selectedCount} selected
          </span>
          <div className="flex-1" />
          <button
            onClick={onBulkConfirm}
            disabled={bulkUpdating}
            title="Confirm selected bookings"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-purple-700 rounded-full hover:bg-purple-100 active:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            Confirm
          </button>
          <button
            onClick={onBulkStart}
            disabled={bulkUpdating}
            title="Start selected bookings"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-purple-700 rounded-full hover:bg-purple-100 active:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            Start
          </button>
          <button
            onClick={onBulkComplete}
            disabled={bulkUpdating}
            title="Complete selected bookings"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-purple-700 rounded-full hover:bg-purple-100 active:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            Complete
          </button>
          <button
            onClick={onBulkCancel}
            disabled={bulkUpdating}
            title="Cancel selected bookings"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 rounded-full hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={onBulkEmail}
            disabled={bulkUpdating}
            title="Send email to selected"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-purple-700 rounded-full hover:bg-purple-100 active:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
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
        {statusFilter === "all" && (
          <span className="ml-2">(cancelled trips hidden)</span>
        )}
      </div>
    </div>
  );
}
