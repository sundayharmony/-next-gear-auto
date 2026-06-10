"use client";

import Link from "next/link";
import {
  ShieldBan,
  Trash2,
  Loader2,
  Car,
  Pencil,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getStaffVehicleDetailsHref } from "@/lib/admin/staff-vehicle-links";
import {
  type BlockedDate,
  formatBlockedDate,
  formatBlockedDateShort,
  formatBlockedTime,
} from "./blocked-dates-types";

export interface BlockedDatesGridProps {
  blocks: BlockedDate[];
  loading: boolean;
  today: string;
  pathname: string;
  editingId: string | null;
  deletingId: string | null;
  getVehicleName: (vehicleId: string) => string;
  onSelectDetail: (block: BlockedDate) => void;
  onStartEdit: (block: BlockedDate) => void;
  onDelete: (id: string) => void;
}

export function BlockedDatesGrid({
  blocks,
  loading,
  today,
  pathname,
  editingId,
  deletingId,
  getVehicleName,
  onSelectDetail,
  onStartEdit,
  onDelete,
}: BlockedDatesGridProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Loading blocked dates...</p>
      </div>
    );
  }

  if (blocks.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
        <ShieldBan className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-700">No blocked dates</h3>
        <p className="text-sm text-gray-400 mt-1">
          Block dates manually or paste a Turo email to sync bookings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {blocks.map((block) => {
        const dayCount =
          Math.ceil(
            (new Date(block.end_date + "T00:00:00").getTime() -
              new Date(block.start_date + "T00:00:00").getTime()) /
              86400000
          ) + 1;
        const isPast = block.end_date < today;

        return (
          <div
            key={block.id}
            onClick={() => onSelectDetail(block)}
            className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
              isPast
                ? "bg-gray-50 border-gray-200 opacity-60"
                : block.is_extension
                ? "bg-blue-50/40 border-blue-200 hover:border-blue-300"
                : "bg-white border-gray-200 hover:border-purple-200"
            }`}
          >
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="flex-shrink-0">
                <Car
                  className={`h-5 w-5 ${block.is_extension ? "text-blue-400" : "text-gray-400"}`}
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  <Link
                    href={getStaffVehicleDetailsHref(block.vehicle_id, pathname)}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:text-purple-700 hover:underline"
                  >
                    {getVehicleName(block.vehicle_id)}
                  </Link>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatBlockedDateShort(block.start_date)}
                  {block.pickup_time ? ` ${formatBlockedTime(block.pickup_time)}` : ""}
                  {" → "}
                  {formatBlockedDate(block.end_date)}
                  {block.return_time ? ` ${formatBlockedTime(block.return_time)}` : ""}
                  <span className="text-gray-400 ml-1">
                    ({dayCount} day{dayCount !== 1 ? "s" : ""})
                  </span>
                </p>
                {block.is_extension && block.original_end_date && (
                  <p className="text-xs text-blue-500 mt-0.5">
                    Originally ended {formatBlockedDate(block.original_end_date)}
                  </p>
                )}
                {(block.location || block.earnings != null) && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {block.location && <span>{block.location}</span>}
                    {block.location && block.earnings != null && <span className="mx-1">·</span>}
                    {block.earnings != null && (
                      <span className="text-green-600 font-medium">
                        ${Number(block.earnings).toFixed(2)}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0 ml-3">
              {block.reason && (
                <span
                  className="text-xs text-gray-500 max-w-[200px] truncate hidden sm:inline"
                  title={block.reason}
                >
                  {block.reason}
                </span>
              )}
              {block.is_extension && (
                <Badge
                  variant="outline"
                  className="text-blue-700 border-blue-300 bg-blue-50 text-[10px]"
                  title={
                    block.original_end_date
                      ? `Originally ended ${block.original_end_date}`
                      : "Trip was extended"
                  }
                >
                  Extended
                </Badge>
              )}
              {block.cancelled_at && (
                <Badge
                  variant="outline"
                  className="text-red-700 border-red-300 bg-red-50 text-[10px]"
                  title={`Cancelled ${new Date(block.cancelled_at).toLocaleString()}`}
                >
                  Cancelled
                </Badge>
              )}
              <Badge
                variant="outline"
                className={
                  block.source === "turo-email"
                    ? "text-blue-600 border-blue-200 bg-blue-50 text-[10px]"
                    : "text-gray-600 border-gray-200 bg-gray-50 text-[10px]"
                }
              >
                {block.source === "turo-email" ? "Turo" : "Manual"}
              </Badge>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEdit(block);
                }}
                disabled={!!editingId}
                className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors disabled:opacity-50"
                aria-label="Edit block"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(block.id);
                }}
                disabled={deletingId === block.id}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                aria-label="Remove block"
              >
                {deletingId === block.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
