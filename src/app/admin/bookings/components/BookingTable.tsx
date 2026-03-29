"use client";

import React, { useRef, useEffect } from "react";
import { ArrowUp, ArrowDown, FileText, Shield, Check, AlertTriangle, StickyNote } from "lucide-react";
import { BookingRow, SortField, SortOrder } from "../types";
import { formatDate, formatTime, formatDateShort } from "@/lib/utils/date-helpers";
import { statusColors } from "@/lib/utils/status-colors";
import { calculateRentalDays } from "@/lib/utils/price-calculator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface BookingTableProps {
  bookings: BookingRow[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onSelectBooking: (booking: BookingRow) => void;
  onUpdateStatus: (bookingId: string, newStatus: string) => void;
  updating: string | null;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
}

export default function BookingTable({
  bookings,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onSelectBooking,
  onUpdateStatus,
  updating,
  sortField,
  sortOrder,
  onSort,
}: BookingTableProps) {
  const allSelected = bookings.length > 0 && selectedIds.size === bookings.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < bookings.length;

  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const getStatusActions = (status: string): string[] => {
    switch (status) {
      case "pending":
        return ["confirmed"];
      case "confirmed":
        return ["active"];
      case "active":
        return ["completed"];
      case "completed":
        return [];
      default:
        return [];
    }
  };


  const getBalanceColor = (total: number, deposit: number): string => {
    const balance = total - deposit;
    if (balance === 0) return "text-green-600";
    if (balance < total && balance > 0) return "text-amber-600";
    return "text-red-600";
  };

  const SortableHeader = ({ label, field }: { label: string; field: SortField }) => (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 font-semibold hover:text-gray-700 transition-colors"
    >
      {label}
      {sortField === field && (sortOrder === "asc" ? <ArrowUp size={16} /> : <ArrowDown size={16} />)}
    </button>
  );

  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allSelected}
                onChange={onToggleSelectAll}
                className="rounded border-gray-300 cursor-pointer accent-purple-600"
              />
            </th>
            <th className="px-4 py-3 text-left">
              <SortableHeader label="Customer" field="customer_name" />
            </th>
            <th className="px-4 py-3 text-left font-semibold">Vehicle</th>
            <th className="px-4 py-3 text-left">
              <SortableHeader label="Dates" field="pickup_date" />
            </th>
            <th className="px-4 py-3 text-left">
              <SortableHeader label="Total" field="total_price" />
            </th>
            <th className="px-4 py-3 text-left font-semibold">Balance</th>
            <th className="px-4 py-3 text-left">
              <SortableHeader label="Status" field="status" />
            </th>
            <th className="px-4 py-3 text-left font-semibold">Docs</th>
            <th className="px-4 py-3 text-left font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => {
            const isSelected = selectedIds.has(booking.id);
            const rentalDays = calculateRentalDays(booking.pickup_date, booking.return_date);
            const statusActions = getStatusActions(booking.status);
            const balance = (booking.total_price ?? 0) - (booking.deposit ?? 0);
            const balanceColor = getBalanceColor(booking.total_price ?? 0, booking.deposit ?? 0);

            return (
              <tr
                key={booking.id}
                onClick={() => onSelectBooking(booking)}
                className={`border-b border-gray-200 cursor-pointer transition-colors ${
                  isSelected ? "bg-purple-50 hover:bg-purple-100" : "hover:bg-gray-50"
                }`}
              >
                {/* Checkbox */}
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(booking.id)}
                    className="rounded border-gray-300 cursor-pointer accent-purple-600"
                  />
                </td>

                {/* Customer */}
                <td className="px-4 py-3">
                  <div className="max-w-xs">
                    <div className="font-semibold text-gray-900 truncate">{booking.customer_name}</div>
                    <div className="text-xs text-gray-500 truncate">{booking.customer_email}</div>
                  </div>
                </td>

                {/* Vehicle */}
                <td className="px-4 py-3">
                  <div className="truncate text-gray-700">{booking.vehicleName || "Unknown Vehicle"}</div>
                </td>

                {/* Dates */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="text-gray-900">
                        {formatDateShort(booking.pickup_date)} → {formatDateShort(booking.return_date)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {booking.pickup_time && `${booking.pickup_time}`}
                        {booking.pickup_time && booking.return_time && " – "}
                        {booking.return_time && `${booking.return_time}`}
                      </div>
                      {booking.pickup_location_name && (
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[140px]">📍 {booking.pickup_location_name}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="whitespace-nowrap text-xs">
                      {rentalDays}d
                    </Badge>
                  </div>
                </td>

                {/* Total */}
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-900">${((booking.total_price ?? 0)).toFixed(2)}</div>
                </td>

                {/* Balance */}
                <td className="px-4 py-3">
                  <div className={`font-semibold ${balanceColor}`}>${(balance ?? 0).toFixed(2)}</div>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[booking.status] || "bg-gray-100 text-gray-600"}`}>
                    {booking.status}
                  </span>
                </td>

                {/* Document Indicators */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {booking.id_document_url && (
                      <span title="ID Document"><FileText size={14} className="text-gray-500" /></span>
                    )}
                    {booking.insurance_proof_url && (
                      <span title="Insurance Proof"><Shield size={14} className="text-gray-500" /></span>
                    )}
                    {booking.agreement_signed_at && (
                      <span title="Agreement Signed"><Check size={14} className="text-green-600" /></span>
                    )}
                    {booking.is_overdue && <span title="Overdue"><AlertTriangle size={14} className="text-red-600" /></span>}
                    {booking.admin_notes && <span title="Admin Notes"><StickyNote size={14} className="text-yellow-600" /></span>}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1">
                    {statusActions.map((action) => (
                      <Button
                        key={action}
                        size="sm"
                        variant="outline"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          onUpdateStatus(booking.id, action);
                        }}
                        disabled={updating === booking.id}
                        className="text-xs"
                      >
                        {action === "confirmed" && "Confirm"}
                        {action === "active" && "Start"}
                        {action === "completed" && "Complete"}
                      </Button>
                    ))}
                    {statusActions.length === 0 && <span className="text-xs text-gray-400">—</span>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {bookings.length === 0 && (
        <div className="px-4 py-8 text-center text-gray-500">
          <p>No bookings found</p>
        </div>
      )}
    </Card>
  );
}
