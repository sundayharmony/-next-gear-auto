"use client";

import { RefreshCw } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Vehicle, getVehicleDisplayName } from "@/lib/types";
import {
  type BlockedDatesListTab,
  type TuroSyncStatus,
  TURO_RUNBOOK_URL,
} from "./blocked-dates-types";

interface BlockedDatesFiltersProps {
  listTab: BlockedDatesListTab;
  onListTabChange: (tab: BlockedDatesListTab) => void;
  filterVehicleId: string;
  onFilterVehicleIdChange: (vehicleId: string) => void;
  vehicles: Vehicle[];
  filteredCount: number;
  turoSyncStatus: TuroSyncStatus | null;
  lastTuroIngest: string | null;
  syncingStatus?: boolean;
  onRefreshSyncStatus?: () => void;
}

export function BlockedDatesFilters({
  listTab,
  onListTabChange,
  filterVehicleId,
  onFilterVehicleIdChange,
  vehicles,
  filteredCount,
  turoSyncStatus,
  lastTuroIngest,
  syncingStatus,
  onRefreshSyncStatus,
}: BlockedDatesFiltersProps) {
  return (
    <>
      {turoSyncStatus && (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-600">
          <span>
            Turo sync: {turoSyncStatus.active} active, {turoSyncStatus.cancelled} cancelled
            {!turoSyncStatus.hasCancelledAt && (
              <span className="ml-2 text-amber-700">(cancelled_at column missing)</span>
            )}
          </span>
          {lastTuroIngest && (
            <span>Last ingest: {new Date(lastTuroIngest).toLocaleString()}</span>
          )}
          {onRefreshSyncStatus && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={syncingStatus}
              onClick={onRefreshSyncStatus}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${syncingStatus ? "animate-spin" : ""}`} />
              Refresh status
            </Button>
          )}
          <a
            href={TURO_RUNBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-purple-700 hover:underline"
          >
            Turo runbook
          </a>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {(["all", "manual", "turo", "cancelled"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onListTabChange(tab)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              listTab === tab
                ? "bg-purple-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab === "all"
              ? "All"
              : tab === "manual"
                ? "Manual blocks"
                : tab === "turo"
                  ? "Turo trips"
                  : "Cancelled"}
          </button>
        ))}
      </div>
      <label className="text-sm font-medium text-gray-700">Filter by vehicle:</label>
      <Select
        value={filterVehicleId}
        onChange={(e) => onFilterVehicleIdChange(e.target.value)}
        aria-label="Filter blocked dates by vehicle"
      >
        <option value="">All Vehicles</option>
        {vehicles.map((v) => (
          <option key={v.id} value={v.id}>
            {getVehicleDisplayName(v)}
          </option>
        ))}
      </Select>
      <span className="text-xs text-gray-400">
        {filteredCount} blocked range{filteredCount !== 1 ? "s" : ""}
      </span>
    </div>
    </>
  );
}
