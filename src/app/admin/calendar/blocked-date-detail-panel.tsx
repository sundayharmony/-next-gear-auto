"use client";

import { X } from "lucide-react";
import type { VehicleListItem } from "@/lib/types";
import { formatTime, formatDate } from "@/lib/utils/date-helpers";
import { getTuroDriverFromReason } from "@/lib/utils/turo-blocked-date";
import { displayBlockedDateLocation } from "@/app/admin/blocked-dates/blocked-dates-types";
import { StaffSidePanel } from "@/components/staff/staff-overlay";
import type { BlockedDateEntry } from "./calendar-model";

interface BlockedDateDetailPanelProps {
  blocked: BlockedDateEntry;
  vehicle?: VehicleListItem;
  onClose: () => void;
}

export function BlockedDateDetailPanel({
  blocked,
  vehicle,
  onClose,
}: BlockedDateDetailPanelProps) {
  return (
    <StaffSidePanel onClose={onClose} ariaLabel="Blocked trip details">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Blocked Trip Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 -mr-2"
            aria-label="Close blocked trip details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs text-gray-500">Vehicle</p>
            <p className="font-semibold">
              {vehicle
                ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
                : "Unknown vehicle"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Pickup</p>
              <p className="font-medium">{formatDate(blocked.start_date)}</p>
              <p className="text-sm text-gray-500">
                {blocked.pickup_time ? formatTime(blocked.pickup_time) : "Time not provided"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Return</p>
              <p className="font-medium">{formatDate(blocked.end_date)}</p>
              <p className="text-sm text-gray-500">
                {blocked.return_time ? formatTime(blocked.return_time) : "Time not provided"}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500">Driver</p>
            <p className="font-medium">
              {getTuroDriverFromReason(blocked.reason) || "Unknown"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Pickup Location</p>
            <p className="font-medium">{displayBlockedDateLocation(blocked.location) || "Not available"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Earnings</p>
            <p className="font-medium">
              {blocked.earnings != null
                ? `$${Number(blocked.earnings).toFixed(2)}`
                : "Not available"}
            </p>
          </div>
          {blocked.is_extension && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              Extension detected
              {blocked.original_end_date
                ? ` — originally ended ${formatDate(blocked.original_end_date)}`
                : ""}
            </div>
          )}
          {blocked.reason && (
            <div>
              <p className="text-xs text-gray-500">Notes</p>
              <p className="font-medium">{blocked.reason}</p>
            </div>
          )}
        </div>
    </StaffSidePanel>
  );
}
