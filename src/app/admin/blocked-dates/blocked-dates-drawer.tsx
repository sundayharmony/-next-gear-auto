"use client";

import Link from "next/link";
import {
  ShieldBan,
  Loader2,
  Mail,
  X,
  AlertTriangle,
  Calendar,
  Save,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Vehicle, getVehicleDisplayName } from "@/lib/types";
import { getTuroDriverFromReason } from "@/lib/utils/turo-blocked-date";
import { getStaffVehicleDetailsHref } from "@/lib/admin/staff-vehicle-links";
import {
  type BlockedDate,
  type OverlapConflict,
  type ParseResult,
  formatBlockedDate,
  formatBlockedDateShort,
  formatBlockedTime,
} from "./blocked-dates-types";

// ── Manual block form ──

export interface BlockedDatesManualFormProps {
  show: boolean;
  vehicles: Vehicle[];
  today: string;
  manualVehicleId: string;
  onManualVehicleIdChange: (id: string) => void;
  manualStartDate: string;
  onManualStartDateChange: (date: string) => void;
  manualEndDate: string;
  onManualEndDateChange: (date: string) => void;
  manualReason: string;
  onManualReasonChange: (reason: string) => void;
  saving: boolean;
  onSubmit: () => void;
}

export function BlockedDatesManualForm({
  show,
  vehicles,
  today,
  manualVehicleId,
  onManualVehicleIdChange,
  manualStartDate,
  onManualStartDateChange,
  manualEndDate,
  onManualEndDateChange,
  manualReason,
  onManualReasonChange,
  saving,
  onSubmit,
}: BlockedDatesManualFormProps) {
  if (!show) return null;

  return (
    <Card className="mb-6 border-purple-200 bg-purple-50/30">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold text-purple-800 mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Block Date Range
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">
              Vehicle
            </label>
            <Select
              value={manualVehicleId}
              onChange={(e) => onManualVehicleIdChange(e.target.value)}
              aria-label="Vehicle for manual block"
            >
              <option value="">Choose vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {getVehicleDisplayName(v)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">
              Start Date
            </label>
            <DatePicker value={manualStartDate} min={today} onChange={onManualStartDateChange} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">
              End Date
            </label>
            <DatePicker
              value={manualEndDate}
              min={manualStartDate || today}
              onChange={onManualEndDateChange}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">
              Reason (optional)
            </label>
            <Input
              value={manualReason}
              onChange={(e) => onManualReasonChange(e.target.value)}
              placeholder="e.g. Turo booking, personal use"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={onSubmit} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <ShieldBan className="h-4 w-4 mr-2" /> Block
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Email paste form ──

export interface BlockedDatesEmailFormProps {
  show: boolean;
  vehicles: Vehicle[];
  emailText: string;
  onEmailTextChange: (text: string) => void;
  parsing: boolean;
  parseResult: ParseResult | null;
  emailVehicleId: string;
  onEmailVehicleIdChange: (id: string) => void;
  saving: boolean;
  onParse: () => void;
  onConfirm: () => void;
}

export function BlockedDatesEmailForm({
  show,
  vehicles,
  emailText,
  onEmailTextChange,
  parsing,
  parseResult,
  emailVehicleId,
  onEmailVehicleIdChange,
  saving,
  onParse,
  onConfirm,
}: BlockedDatesEmailFormProps) {
  if (!show) return null;

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50/30">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
          <Mail className="h-4 w-4" /> Paste Turo Booking Email
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Copy the full text of the Turo booking confirmation email and paste it below. The system
          will extract the vehicle, dates, and guest name automatically.
        </p>
        <Textarea
          value={emailText}
          onChange={(e) => onEmailTextChange(e.target.value)}
          placeholder="Paste the full Turo booking confirmation email here..."
        />
        <div className="flex gap-2 mt-3">
          <Button onClick={onParse} disabled={parsing || !emailText.trim()} size="sm">
            {parsing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Parsing...
              </>
            ) : (
              "Parse Email"
            )}
          </Button>
        </div>

        {parseResult && (
          <div className="mt-4 p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge
                className={
                  parseResult.confidence === "high"
                    ? "bg-green-100 text-green-700"
                    : parseResult.confidence === "medium"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }
              >
                {parseResult.confidence} confidence
              </Badge>
              {parseResult.isCancellation && (
                <Badge className="bg-red-100 text-red-800">Cancellation email</Badge>
              )}
              {parseResult.isExtension && !parseResult.isCancellation && (
                <Badge className="bg-blue-100 text-blue-800">Extension</Badge>
              )}
              {parseResult.rawMatches.length > 0 && (
                <span className="text-xs text-gray-400">
                  Found: {parseResult.rawMatches.join(" · ")}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="text-xs font-medium text-gray-500">Start Date</label>
                <p className="font-semibold">
                  {parseResult.startDate || <span className="text-red-500">Not found</span>}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">End Date</label>
                <p className="font-semibold">
                  {parseResult.endDate || <span className="text-red-500">Not found</span>}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Guest</label>
                <p className="font-semibold">{parseResult.guestName || "—"}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Vehicle Detected</label>
                <p className="font-semibold">{parseResult.vehicleDescription || "—"}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Pickup Time</label>
                <p className="font-semibold">
                  {parseResult.pickupTime ? formatBlockedTime(parseResult.pickupTime) : "—"}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Return Time</label>
                <p className="font-semibold">
                  {parseResult.returnTime ? formatBlockedTime(parseResult.returnTime) : "—"}
                </p>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500">Pickup Location</label>
                <p className="font-semibold">{parseResult.location || "—"}</p>
              </div>
            </div>

            {parseResult.startDate && parseResult.endDate && parseResult.isCancellation && (
              <div className="mt-4 pt-3 border-t">
                <p className="text-xs text-red-700 mb-3">
                  This will find the matching active Turo trip and remove it from the calendar.
                </p>
                <Button
                  onClick={onConfirm}
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-700"
                  size="sm"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Removing...
                    </>
                  ) : (
                    <>
                      Remove cancelled trip ({parseResult.startDate} → {parseResult.endDate})
                    </>
                  )}
                </Button>
              </div>
            )}

            {parseResult.startDate && parseResult.endDate && !parseResult.isCancellation && (
              <div className="mt-4 pt-3 border-t">
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Select Vehicle to Block
                </label>
                <Select
                  value={emailVehicleId}
                  onChange={(e) => onEmailVehicleIdChange(e.target.value)}
                  aria-label="Vehicle for email block"
                >
                  <option value="">Choose vehicle...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {getVehicleDisplayName(v)}
                    </option>
                  ))}
                </Select>
                <Button
                  onClick={onConfirm}
                  disabled={!emailVehicleId || saving}
                  className="mt-3 bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Blocking...
                    </>
                  ) : (
                    <>
                      <ShieldBan className="h-4 w-4 mr-2" /> Block {parseResult.startDate} →{" "}
                      {parseResult.endDate}
                    </>
                  )}
                </Button>
              </div>
            )}

            {(!parseResult.startDate || !parseResult.endDate) && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Could not extract complete dates from the email. You can block dates manually
                  instead using the &quot;Block Dates&quot; button.
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Edit drawer ──

export interface BlockedDatesEditDrawerProps {
  block: BlockedDate | null;
  vehicles: Vehicle[];
  editVehicleId: string;
  onEditVehicleIdChange: (id: string) => void;
  editStartDate: string;
  onEditStartDateChange: (date: string) => void;
  editEndDate: string;
  onEditEndDateChange: (date: string) => void;
  editReason: string;
  onEditReasonChange: (reason: string) => void;
  editPickupTime: string;
  onEditPickupTimeChange: (time: string) => void;
  editReturnTime: string;
  onEditReturnTimeChange: (time: string) => void;
  editLocation: string;
  onEditLocationChange: (location: string) => void;
  editEarnings: string;
  onEditEarningsChange: (earnings: string) => void;
  editOriginalEndDate: string;
  isExtending: boolean;
  extensionDays: number;
  overlapConflicts: OverlapConflict[];
  forceOverride: boolean;
  onForceOverrideChange: (force: boolean) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function BlockedDatesEditDrawer({
  block,
  vehicles,
  editVehicleId,
  onEditVehicleIdChange,
  editStartDate,
  onEditStartDateChange,
  editEndDate,
  onEditEndDateChange,
  editReason,
  onEditReasonChange,
  editPickupTime,
  onEditPickupTimeChange,
  editReturnTime,
  onEditReturnTimeChange,
  editLocation,
  onEditLocationChange,
  editEarnings,
  onEditEarningsChange,
  editOriginalEndDate,
  isExtending,
  extensionDays,
  overlapConflicts,
  forceOverride,
  onForceOverrideChange,
  saving,
  onSave,
  onCancel,
}: BlockedDatesEditDrawerProps) {
  if (!block) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onCancel} />
      <div
        className="w-full max-w-[calc(100vw-1rem)] sm:max-w-xl bg-white shadow-xl overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Edit blocked date"
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Edit Blocked Date</h2>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 -mr-2"
            aria-label="Close edit drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">
          {isExtending && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>
                  <strong>Extending trip</strong> — end date moves from{" "}
                  <span className="line-through">{formatBlockedDateShort(editOriginalEndDate)}</span>
                  {" → "}
                  <strong>{formatBlockedDate(editEndDate)}</strong>{" "}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                    +{extensionDays} day{extensionDays !== 1 ? "s" : ""}
                  </span>
                </span>
              </div>
              {block.is_extension && block.original_end_date && (
                <p className="text-xs text-blue-500 mt-1 ml-6">
                  Note: This trip was previously extended from{" "}
                  {formatBlockedDate(block.original_end_date)}
                </p>
              )}
            </div>
          )}
          {!isExtending && block.is_extension && block.original_end_date && (
            <div className="mb-3 p-2 bg-blue-50/50 border border-blue-100 rounded-lg flex items-center gap-2 text-xs text-blue-600">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>
                Previously extended — originally ended {formatBlockedDate(block.original_end_date)}
              </span>
            </div>
          )}

          {overlapConflicts.length > 0 && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-300 rounded-lg">
              <div className="flex items-start gap-2 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <strong>
                    Overlap conflict{overlapConflicts.length > 1 ? "s" : ""} detected:
                  </strong>
                  <ul className="mt-1 space-y-1">
                    {overlapConflicts.map((c) => (
                      <li key={c.id} className="text-xs">
                        {formatBlockedDate(c.start_date)} → {formatBlockedDate(c.end_date)}
                        {c.reason ? ` (${c.reason})` : ""}
                      </li>
                    ))}
                  </ul>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forceOverride}
                      onChange={(e) => onForceOverrideChange(e.target.checked)}
                      className="rounded border-amber-400"
                    />
                    <span className="text-xs font-medium">Force override — save anyway</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">
                Vehicle
              </label>
              <Select
                value={editVehicleId}
                onChange={(e) => onEditVehicleIdChange(e.target.value)}
                aria-label="Edit vehicle"
              >
                <option value="">Choose vehicle...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {getVehicleDisplayName(v)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">
                Start Date
              </label>
              <DatePicker value={editStartDate} onChange={onEditStartDateChange} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">
                End Date
                {isExtending && (
                  <span className="ml-1 text-blue-600 normal-case font-normal">(extending)</span>
                )}
              </label>
              <DatePicker value={editEndDate} min={editStartDate} onChange={onEditEndDateChange} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">
                Reason
              </label>
              <Input
                value={editReason}
                onChange={(e) => onEditReasonChange(e.target.value)}
                placeholder="e.g. Turo booking, personal use"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">
                Pickup Time
              </label>
              <Input
                type="time"
                value={editPickupTime}
                onChange={(e) => onEditPickupTimeChange(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">
                Return Time
              </label>
              <Input
                type="time"
                value={editReturnTime}
                onChange={(e) => onEditReturnTimeChange(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">
                Location
              </label>
              <Input
                value={editLocation}
                onChange={(e) => onEditLocationChange(e.target.value)}
                placeholder="e.g. Newark, NJ"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">
                Earnings ($)
              </label>
              <Input
                type="number"
                step="0.01"
                value={editEarnings}
                onChange={(e) => onEditEarningsChange(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Button
              onClick={onSave}
              disabled={saving || (overlapConflicts.length > 0 && !forceOverride)}
              size="sm"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isExtending ? (
                <>
                  <Calendar className="h-4 w-4 mr-1" /> Extend Trip
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" /> Save
                </>
              )}
            </Button>
            <Button onClick={onCancel} variant="outline" size="sm" disabled={saving}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Detail drawer ──

export interface BlockedDatesDetailDrawerProps {
  block: BlockedDate | null;
  pathname: string;
  getVehicleName: (vehicleId: string) => string;
  onClose: () => void;
}

export function BlockedDatesDetailDrawer({
  block,
  pathname,
  getVehicleName,
  onClose,
}: BlockedDatesDetailDrawerProps) {
  if (!block) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div
        className="w-full max-w-[calc(100vw-1rem)] sm:max-w-lg bg-white shadow-xl overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Blocked trip details"
      >
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
              <Link
                href={getStaffVehicleDetailsHref(block.vehicle_id, pathname)}
                className="hover:text-purple-700 hover:underline"
              >
                {getVehicleName(block.vehicle_id)}
              </Link>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Start</p>
              <p className="font-medium">{formatBlockedDate(block.start_date)}</p>
              <p className="text-sm text-gray-500">
                {block.pickup_time
                  ? formatBlockedTime(block.pickup_time)
                  : "Time not provided"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">End</p>
              <p className="font-medium">{formatBlockedDate(block.end_date)}</p>
              <p className="text-sm text-gray-500">
                {block.return_time
                  ? formatBlockedTime(block.return_time)
                  : "Time not provided"}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500">Driver</p>
            <p className="font-medium">
              {getTuroDriverFromReason(block.reason) || "Unknown"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Pickup Location</p>
            <p className="font-medium">{block.location || "Not available"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Earnings</p>
            <p className="font-medium">
              {block.earnings != null
                ? `$${Number(block.earnings).toFixed(2)}`
                : "Not available"}
            </p>
          </div>
          {block.is_extension && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              Extension detected
              {block.original_end_date
                ? ` — originally ended ${formatBlockedDate(block.original_end_date)}`
                : ""}
            </div>
          )}
          {block.cancelled_at && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              Cancelled on {new Date(block.cancelled_at).toLocaleString()}
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500">Source</p>
            <p className="font-medium">
              {block.source === "turo-email" ? "Turo Email" : "Manual"}
            </p>
          </div>
          {block.reason && (
            <div>
              <p className="text-xs text-gray-500">Notes</p>
              <p className="font-medium">{block.reason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
