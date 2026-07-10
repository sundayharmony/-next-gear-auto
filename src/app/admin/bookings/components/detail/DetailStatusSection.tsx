"use client";

import React from "react";
import Link from "next/link";
import {
  User,
  UserPlus,
  Shield,
  Check,
  Link2,
  Copy,
  Clock,
  FileText,
  AlertTriangle,
  Upload,
  Plus,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select } from "@/components/ui/select";
import { STATUS_STEPS, TIME_SLOTS } from "../../types";
import { formatDate, formatTime } from "@/lib/utils/date-helpers";
import { getStaffVehicleDetailsHref } from "@/lib/admin/staff-vehicle-links";
import { isAllowedExternalHref } from "@/lib/utils/safe-url";
import { isAgreementComplete } from "@/lib/agreement/agreement-complete";
import type { BookingDetailContext } from "./booking-detail-context";

interface DetailStatusSectionProps {
  ctx: BookingDetailContext;
}

export function DetailStatusSection({ ctx }: DetailStatusSectionProps) {
  const {
    booking,
    vehicles,
    panelBase,
    editMode,
    editData,
    setEditData,
    saving,
    pendingStatus,
    setPendingStatus,
    currentStatusIndex,
    handleStatusStepClick,
    updateStatus,
    handleDuplicateBooking,
    customerDetailsBasePath,
    handleDocumentUpload,
    vehicleLabel,
    locations,
    displayReturnDate,
    onError,
  } = ctx;

  return (
    <>
      {/* Booking ID & Status */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-mono mb-1">Booking ID</p>
          <p className="font-mono text-sm">{booking.id}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-1">
            Origin: {booking.origin_channel === "manager_panel" ? "Manager Panel" : booking.origin_channel === "owner_panel" ? "Owner Panel" : booking.origin_channel === "admin_panel" ? "Admin Panel" : booking.origin_channel === "public_checkout" ? "Public Checkout" : "Unknown"}
          </p>
        </div>
        <div>
          <StatusBadge status={booking.status} />
        </div>
      </div>

      {/* Status Tracker */}
      {booking.status !== "cancelled" && (
        <div className="py-3 sm:py-4 border-y border-gray-200 overflow-x-auto">
          <div className="flex items-center justify-between min-w-0">
            {STATUS_STEPS.map((step, idx) => {
              const isCompleted = idx < currentStatusIndex;
              const isCurrent = idx === currentStatusIndex;
              const isFuture = idx > currentStatusIndex;
              const isLocked = step === "confirmed" && isFuture && !isAgreementComplete(booking);
              const isClickable = isFuture && !isLocked;

              return (
                <React.Fragment key={step}>
                  <div
                    className={`flex flex-col items-center gap-2 flex-1 ${
                      isClickable ? "cursor-pointer" : isLocked ? "cursor-not-allowed opacity-60" : ""
                    }`}
                    onClick={() =>
                      isClickable ? handleStatusStepClick(idx) : isLocked ? onError("Cannot confirm — the customer has not signed the rental agreement yet.") : undefined
                    }
                    title={isLocked ? "Agreement must be signed before confirming" : undefined}
                  >
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-semibold transition-colors ${
                        isCompleted
                          ? "bg-green-500"
                          : isCurrent
                          ? "bg-purple-600"
                          : isLocked
                          ? "bg-amber-400"
                          : "bg-gray-300"
                      } ${isClickable ? "hover:opacity-80" : ""}`}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4" />
                      ) : isLocked ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <span className="text-xs">{idx + 1}</span>
                      )}
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium capitalize text-center leading-tight">
                      {isLocked ? "Awaiting signature" : step}
                    </span>
                  </div>

                  {idx < STATUS_STEPS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 ${
                        isCompleted ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          {pendingStatus && (
            <div className="mt-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-amber-800">Move to &quot;{pendingStatus}&quot;?</span>
              <div className="ml-auto flex gap-1.5">
                <button onClick={() => { updateStatus(pendingStatus); setPendingStatus(null); }} className="px-3 py-1 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700">Yes</button>
                <button onClick={() => setPendingStatus(null)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300">No</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Duplicate button */}
      <button
        onClick={handleDuplicateBooking}
        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
      >
        <Copy className="w-3 h-3" />
        Duplicate
      </button>

      {/* Customer Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <User className="w-4 h-4" />
          Customer
        </h3>
        {editMode ? (
          <div className="space-y-3">
            <Input
              label="Name"
              value={editData.customer_name || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEditData({ ...editData, customer_name: e.target.value })
              }
              placeholder="Customer name"
            />
            <Input
              label="Email"
              type="email"
              value={editData.customer_email || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEditData({
                  ...editData,
                  customer_email: e.target.value,
                })
              }
              placeholder="email@example.com"
            />
            <Input
              label="Phone"
              value={editData.customer_phone || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEditData({
                  ...editData,
                  customer_phone: e.target.value,
                })
              }
              placeholder="(555) 123-4567"
            />
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">{booking.customer_name}</span>
            </p>
            <p className="text-gray-600">{booking.customer_email}</p>
            {booking.customer_phone && (
              <p className="text-gray-600">{booking.customer_phone}</p>
            )}
            <div className="flex gap-2 pt-2">
              {booking.customer_id && (
                <a
                  href={`${customerDetailsBasePath}/${booking.customer_id}`}
                  className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1"
                >
                  <Link2 className="w-3 h-3" />
                  View Client
                </a>
              )}
              {!booking.customer_id && (
                <button className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1">
                  <UserPlus className="w-3 h-3" />
                  Add as Customer
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ID Document */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4" />
          ID Document
        </h3>
        {booking.id_document_url ? (
          <div className="space-y-2">
            <a
              href={isAllowedExternalHref(booking.id_document_url) || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
            >
              <Link2 className="w-3 h-3" />
              View Document
            </a>
            <label className="block">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleDocumentUpload(e, "id_document")}
                disabled={saving}
                className="hidden"
              />
              <span className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1">
                <Upload className="w-3 h-3" />
                Replace
              </span>
            </label>
          </div>
        ) : (
          <label className="block">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => handleDocumentUpload(e, "id_document")}
              disabled={saving}
              className="hidden"
            />
            <span className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1">
              <Upload className="w-3 h-3" />
              Upload Document
            </span>
          </label>
        )}
      </div>

      {/* Vehicle */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Vehicle</h3>
        {editMode ? (
          <Select
            value={editData.vehicle_id || ""}
            onChange={(e) =>
              setEditData({ ...editData, vehicle_id: e.target.value })
            }
          >
            <option value="">Select vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.year} {v.make} {v.model}
              </option>
            ))}
          </Select>
        ) : (
          <p className="text-sm text-gray-700">
            <Link
              href={getStaffVehicleDetailsHref(booking.vehicle_id, panelBase)}
              className="hover:text-purple-700 hover:underline"
            >
              {vehicleLabel}
            </Link>
          </p>
        )}
      </div>

      {/* Dates & Times */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Rental Period
        </h3>
        {editMode ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">
                  Pickup Date
                </label>
                <DatePicker
                  value={editData.pickup_date || ""}
                  onChange={(val) =>
                    setEditData({
                      ...editData,
                      pickup_date: val,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">
                  Pickup Time
                </label>
                <Select
                  value={editData.pickup_time || ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      pickup_time: e.target.value,
                    })
                  }
                >
                  <option value="">Select time</option>
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">
                  Return Date
                </label>
                <DatePicker
                  value={editData.return_date || ""}
                  onChange={(val) =>
                    setEditData({
                      ...editData,
                      return_date: val,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">
                  Return Time
                </label>
                <Select
                  value={editData.return_time || ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      return_time: e.target.value,
                    })
                  }
                >
                  <option value="">Select time</option>
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            {/* Location */}
            {locations.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Pickup Location
                  </label>
                  <Select
                    value={editData.pickup_location_id || ""}
                    onChange={(e) => setEditData({ ...editData, pickup_location_id: e.target.value || undefined })}
                  >
                    <option value="">None</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}{l.surcharge > 0 ? ` (+$${l.surcharge.toFixed(2)})` : ''}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Dropoff Location
                  </label>
                  <Select
                    value={editData.return_location_id || ""}
                    onChange={(e) => setEditData({ ...editData, return_location_id: e.target.value || undefined })}
                  >
                    <option value="">Same as pickup</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}{l.surcharge > 0 ? ` (+$${l.surcharge.toFixed(2)})` : ''}</option>
                    ))}
                  </Select>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-1">Pickup</p>
                <p className="font-medium">{booking.pickup_date ? formatDate(booking.pickup_date) : "—"}</p>
                {booking.pickup_time && (
                  <p className="text-gray-600 text-xs">
                    {formatTime(booking.pickup_time)}
                  </p>
                )}
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Return</p>
                <p className="font-medium">{displayReturnDate ? formatDate(displayReturnDate) : "—"}</p>
                {booking.return_time && (
                  <p className="text-gray-600 text-xs">
                    {formatTime(booking.return_time)}
                  </p>
                )}
              </div>
            </div>
            {(booking.pickup_location_name || booking.return_location_name) && (
              <div className="flex items-center justify-between py-2">
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <MapPin className="w-3.5 h-3.5" /> Location
                </span>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">{booking.pickup_location_name || "—"}</span>
                  {booking.return_location_name && booking.return_location_name !== booking.pickup_location_name && (
                    <span className="text-xs text-gray-500 block">Return: {booking.return_location_name}</span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Extras */}
      {booking.extras && booking.extras.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Extras
          </h3>
          <div className="space-y-2">
            {booking.extras.map((extra) => {
              if (!extra?.id || !extra?.name) return null;
              return (
                <div
                  key={extra.id}
                  className="flex justify-between text-sm border-l-2 border-blue-200 pl-3 py-1"
                >
                  <span className="text-gray-700">{extra.name}</span>
                  <span className="font-medium">
                    ${typeof extra.pricePerDay === 'number' ? extra.pricePerDay : '0'}/day
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Insurance */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Insurance
        </h3>
        {booking.insurance_opted_out ? (
          <div className="space-y-2">
            <StatusBadge status="warning" label="Opted Out (Own Coverage)" />
            {booking.insurance_proof_url ? (
              <a
                href={isAllowedExternalHref(booking.insurance_proof_url) || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
              >
                <Link2 className="w-3 h-3" />
                View Proof
              </a>
            ) : (
              <label className="block">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleDocumentUpload(e, "insurance_proof")}
                  disabled={saving}
                  className="hidden"
                />
                <span className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  Upload Proof
                </span>
              </label>
            )}
          </div>
        ) : (
          <StatusBadge status="success" label="NextGearAuto Insurance Included" />
        )}
      </div>
    </>
  );
}
