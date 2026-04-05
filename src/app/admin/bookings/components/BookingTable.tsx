"use client";

import React, { useRef, useEffect } from "react";
import { ArrowUp, ArrowDown, FileText, Shield, Check, AlertTriangle, StickyNote, Calendar, MapPin } from "lucide-react";
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
      aria-label={`Sort by ${label}${sortField === field ? ` (${sortOrder === "asc" ? "ascending" : "descending"})` : ""}`}
    >
      {label}
      {sortField === field && (sortOrder === "asc" ? <ArrowUp size={16} /> : <ArrowDown size={16} />)}
    </button>
  );

  const getStatusActionLabel = (action: string) => {
    if (action === "confirmed") return "Confirm";
    if (action === "active") return "Start";
    if (action === "completed") return "Complete";
    return action;
  };

  // Empty state
  if (bookings.length === 0) {
    return (
      <Card>
        <div className="px-4 py-12 text-center">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No bookings found</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      {/* ─── MOBILE CARD VIEW (< md) ─── */}
      <div className="md:hidden space-y-3">
        {/* Mobile sort controls */}
        <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
          <span className="font-medium">Sort:</span>
          <button onClick={() => onSort("customer_name")} className={`px-2 py-1 rounded-full ${sortField === "customer_name" ? "bg-purple-100 text-purple-700 font-medium" : "bg-gray-100"}`}>
            Name {sortField === "customer_name" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>
          <button onClick={() => onSort("pickup_date")} className={`px-2 py-1 rounded-full ${sortField === "pickup_date" ? "bg-purple-100 text-purple-700 font-medium" : "bg-gray-100"}`}>
            Date {sortField === "pickup_date" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>
          <button onClick={() => onSort("total_price")} className={`px-2 py-1 rounded-full ${sortField === "total_price" ? "bg-purple-100 text-purple-700 font-medium" : "bg-gray-100"}`}>
            Price {sortField === "total_price" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>
        </div>

        {bookings.map((booking) => {
          const isSelected = selectedIds.has(booking.id);
          const rentalDays = calculateRentalDays(booking.pickup_date, booking.return_date);
          const statusActions = getStatusActions(booking.status);
          const balance = (booking.total_price ?? 0) - (booking.deposit ?? 0);
          const balanceColor = getBalanceColor(booking.total_price ?? 0, booking.deposit ?? 0);

          return (
            <Card
              key={booking.id}
              className={`p-4 cursor-pointer transition-colors ${isSelected ? "bg-purple-50 ring-1 ring-purple-300" : "hover:bg-gray-50"}`}
              onClick={() => onSelectBooking(booking)}
            >
              {/* Top row: customer + status */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(booking.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border-gray-300 cursor-pointer accent-purple-600 shrink-0 mt-0.5"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{booking.customer_name || "Unknown"}</p>
                    <p className="text-xs text-gray-500 truncate">{booking.customer_email || "No email"}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusColors[booking.status || "pending"] || "bg-gray-200 text-gray-800"}`}>
                  {booking.status || "pending"}
                </span>
              </div>

              {/* Vehicle */}
              <p className="text-sm text-gray-700 mb-2 truncate">{booking.vehicleName || "Unknown Vehicle"}</p>

              {/* Dates row */}
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>{formatDateShort(booking.pickup_date)} → {formatDateShort(booking.return_date)}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{rentalDays}d</Badge>
              </div>

              {/* Times & Location */}
              {(booking.pickup_time || booking.pickup_location_name) && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-3">
                  {booking.pickup_time && (
                    <span>{formatTime(booking.pickup_time)}{booking.return_time ? ` – ${formatTime(booking.return_time)}` : ""}</span>
                  )}
                  {booking.pickup_location_name && (
                    <span className="flex items-center gap-0.5 min-w-0 flex-1">
                      <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{booking.pickup_location_name}</span>
                    </span>
                  )}
                </div>
              )}

              {/* Bottom row: price + balance + doc icons + actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900 text-sm">${(booking.total_price ?? 0).toFixed(2)}</span>
                  <span className={`text-xs font-medium ${balanceColor}`}>
                    {balance === 0 ? "Paid" : `$${balance.toFixed(2)} due`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Doc indicators */}
                  <div className="flex items-center gap-1">
                    {booking.id_document_url && <FileText size={13} className="text-gray-400" />}
                    {booking.insurance_proof_url && <Shield size={13} className="text-gray-400" />}
                    {booking.agreement_signed_at && <Check size={13} className="text-green-500" />}
                    {booking.is_overdue && <AlertTriangle size={13} className="text-red-500" />}
                    {booking.admin_notes && <StickyNote size={13} className="text-yellow-500" />}
                  </div>

                  {/* Quick action buttons */}
                  {statusActions.length > 0 && (
                    <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                      {statusActions.map((action) => (
                        <Button
                          key={action}
                          size="sm"
                          variant="outline"
                          onClick={() => onUpdateStatus(booking.id, action)}
                          disabled={updating === booking.id}
                          className="text-xs h-7 px-2"
                        >
                          {getStatusActionLabel(action)}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ─── DESKTOP TABLE VIEW (>= md) ─── */}
      <Card className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left" scope="col">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="rounded border-gray-300 cursor-pointer accent-purple-600"
                  aria-label="Select all bookings"
                />
              </th>
              <th className="px-4 py-3 text-left" scope="col">
                <SortableHeader label="Customer" field="customer_name" />
              </th>
              <th className="px-4 py-3 text-left font-semibold" scope="col">Vehicle</th>
              <th className="px-4 py-3 text-left" scope="col">
                <SortableHeader label="Dates" field="pickup_date" />
              </th>
              <th className="px-4 py-3 text-left" scope="col">
                <SortableHeader label="Total" field="total_price" />
              </th>
              <th className="px-4 py-3 text-left font-semibold" scope="col">Balance</th>
              <th className="px-4 py-3 text-left" scope="col">
                <SortableHeader label="Status" field="status" />
              </th>
              <th className="px-4 py-3 text-left font-semibold" scope="col">Docs</th>
              <th className="px-4 py-3 text-left font-semibold" scope="col">Actions</th>
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
                      <div className="font-semibold text-gray-900 truncate">{booking.customer_name || "Unknown"}</div>
                      <div className="text-xs text-gray-500 truncate">{booking.customer_email || "No email"}</div>
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
                          {booking.pickup_time && formatTime(booking.pickup_time)}
                          {booking.pickup_time && booking.return_time && " – "}
                          {booking.return_time && formatTime(booking.return_time)}
                        </div>
                        {booking.pickup_location_name && (
                          <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[140px] flex items-center gap-1"><MapPin className="h-3 w-3 flex-shrink-0" /> {booking.pickup_location_name}</p>
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
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[booking.status || "pending"] || "bg-gray-200 text-gray-800"}`} aria-label={`Status: ${booking.status || "pending"}`}>
                      {booking.status || "pending"}
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
                          aria-label={`${action === "confirmed" ? "Confirm" : action === "active" ? "Start" : "Complete"} booking ${booking.id}`}
                        >
                          {action === "confirmed" && "Confirm"}
                          {action === "active" && "Start"}
                          {action === "completed" && "Complete"}
                        </Button>
                      ))}
                      {statusActions.length === 0 && <span className="text-xs text-gray-400 opacity-50 cursor-not-allowed">—</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
