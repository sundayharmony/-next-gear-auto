"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminEmptyState } from "@/components/admin/ui-feedback";
import { getStaffVehicleDetailsHref } from "@/lib/admin/staff-vehicle-links";
import type { MaintenanceRecord } from "./maintenance-types";
import {
  formatStatusLabel,
  getStatusBadgeColor,
  getStatusIcon,
} from "./maintenance-status-utils";

export interface MaintenanceListProps {
  loading: boolean;
  records: MaintenanceRecord[];
  filteredRecords: MaintenanceRecord[];
  searchQuery: string;
  panelBase: string;
  onOpenDetail: (record: MaintenanceRecord) => void;
}

export function MaintenanceList({
  loading,
  records,
  filteredRecords,
  searchQuery,
  panelBase,
  onOpenDetail,
}: MaintenanceListProps) {
  if (loading) {
    return (
      <div className="text-center py-12" role="status" aria-live="polite">
        <Loader2 className="h-8 w-8 text-purple-600 animate-spin mx-auto" />
        <p className="mt-4 text-gray-500">Loading records...</p>
      </div>
    );
  }

  if (filteredRecords.length === 0) {
    return (
      <AdminEmptyState
        title={records.length === 0 ? "No maintenance records yet" : "No records found"}
        description={
          records.length === 0
            ? "Add your first maintenance record to start tracking work."
            : searchQuery
              ? `No records match "${searchQuery}".`
              : "No records match the current filter."
        }
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Maintenance records</caption>
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th scope="col" className="px-6 py-3 text-left font-semibold text-gray-900">Vehicle</th>
              <th scope="col" className="px-6 py-3 text-left font-semibold text-gray-900">Title</th>
              <th scope="col" className="px-6 py-3 text-left font-semibold text-gray-900">Status</th>
              <th scope="col" className="px-6 py-3 text-left font-semibold text-gray-900">Cost</th>
              <th scope="col" className="px-6 py-3 text-left font-semibold text-gray-900">Start Date</th>
              <th scope="col" className="px-6 py-3 text-left font-semibold text-gray-900">Completed</th>
              <th scope="col" className="px-6 py-3 text-left font-semibold text-gray-900">Photos</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record) => (
              <tr
                key={record.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500"
                onClick={() => onOpenDetail(record)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenDetail(record);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`View ${record.title} for ${record.vehicleName || "unknown vehicle"}`}
              >
                <td className="px-6 py-3 max-w-[180px]">
                  <span className="font-medium text-gray-900 truncate block" title={record.vehicleName || undefined}>
                    {record.vehicleId ? (
                      <Link
                        href={getStaffVehicleDetailsHref(record.vehicleId, panelBase)}
                        className="hover:text-purple-700 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {record.vehicleName || "—"}
                      </Link>
                    ) : (
                      record.vehicleName || "—"
                    )}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-700 max-w-[200px]">
                  <span className="truncate block" title={record.title}>{record.title}</span>
                  {record.description && (
                    <span className="text-xs text-gray-400 truncate block" title={record.description}>
                      {record.description}
                    </span>
                  )}
                </td>
                <td className="px-6 py-3">
                  <Badge className={getStatusBadgeColor(record.status)}>
                    <span
                      className={`mr-1.5 font-bold ${
                        record.status === "pending"
                          ? "text-yellow-700"
                          : record.status === "in-progress"
                            ? "text-blue-700"
                            : "text-green-700"
                      }`}
                      aria-hidden="true"
                    >
                      ●
                    </span>
                    {getStatusIcon(record.status)}
                    {formatStatusLabel(record.status)}
                  </Badge>
                </td>
                <td className="px-6 py-3 text-gray-700 font-medium">
                  {record.cost !== null ? (
                    `$${record.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  ) : (
                    <span className="text-gray-400 font-normal">—</span>
                  )}
                </td>
                <td className="px-6 py-3 text-gray-600 text-xs">
                  {record.startedDate ? (
                    new Date(record.startedDate + "T12:00:00").toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-3 text-gray-600 text-xs">
                  {record.completedDate ? (
                    new Date(record.completedDate + "T12:00:00").toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-3">
                  {record.photoUrls.length > 0 ? (
                    <Badge variant="secondary" className="text-xs">
                      {record.photoUrls.length} photo{record.photoUrls.length !== 1 ? "s" : ""}
                    </Badge>
                  ) : (
                    <span className="text-gray-400 text-xs">No photos</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
