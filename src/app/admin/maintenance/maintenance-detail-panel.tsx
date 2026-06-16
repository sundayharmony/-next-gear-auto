"use client";

import Link from "next/link";
import {
  Upload,
  Trash2,
  X,
  Pencil,
  Save,
  Loader2,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Vehicle, getVehicleDisplayName } from "@/lib/types";
import { MaintenancePhotoGallery } from "@/components/maintenance-photo-gallery";
import { getStaffVehicleDetailsHref } from "@/lib/admin/staff-vehicle-links";
import type { FormState, MaintenanceRecord } from "./maintenance-types";
import {
  formatStatusLabel,
  getStatusBadgeColor,
  getStatusIcon,
} from "./maintenance-status-utils";
import { StaffSidePanel } from "@/components/staff/staff-overlay";

export interface MaintenanceDetailPanelProps {
  selectedRecord: MaintenanceRecord;
  detailEditMode: boolean;
  detailEditData: FormState;
  vehicles: Vehicle[];
  panelBase: string;
  saving: boolean;
  deletingId: string | null;
  uploadingPhoto: Record<string, boolean>;
  onClose: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: (id: string) => void;
  onEditDataChange: (data: FormState) => void;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>, recordId: string) => void;
  onRemovePhoto: (url: string, context: "new" | "detail") => void;
}

export function MaintenanceDetailPanel({
  selectedRecord,
  detailEditMode,
  detailEditData,
  vehicles,
  panelBase,
  saving,
  deletingId,
  uploadingPhoto,
  onClose,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onEditDataChange,
  onPhotoUpload,
  onRemovePhoto,
}: MaintenanceDetailPanelProps) {
  return (
    <StaffSidePanel
      onClose={onClose}
      ariaLabel={`Maintenance record: ${selectedRecord.title}`}
      maxWidthClassName="sm:max-w-2xl"
    >
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold truncate">
              {detailEditMode ? `Edit: ${selectedRecord.title}` : selectedRecord.title}
            </h2>
            {!detailEditMode && selectedRecord.vehicleName && (
              <p className="text-sm text-gray-500 truncate">
                {selectedRecord.vehicleId ? (
                  <Link
                    href={getStaffVehicleDetailsHref(selectedRecord.vehicleId, panelBase)}
                    className="hover:text-purple-700 hover:underline"
                  >
                    {selectedRecord.vehicleName}
                  </Link>
                ) : (
                  selectedRecord.vehicleName
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!detailEditMode && (
              <button
                onClick={onStartEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close details"
              className="text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {detailEditMode ? (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Vehicle <span className="text-red-500">*</span>
                </label>
                <Select
                  value={detailEditData.vehicleId || ""}
                  onChange={(e) => {
                    const selected = vehicles.find((v) => v.id === e.target.value);
                    onEditDataChange({
                      ...detailEditData,
                      vehicleId: e.target.value,
                      vehicleName: selected ? getVehicleDisplayName(selected) : "",
                    });
                  }}
                >
                  <option value="">Select a vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{getVehicleDisplayName(v)}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <Input
                  value={detailEditData.title || ""}
                  onChange={(e) => onEditDataChange({ ...detailEditData, title: e.target.value })}
                  placeholder="e.g. Oil Change"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Description
                </label>
                <Textarea
                  value={detailEditData.description || ""}
                  onChange={(e) => onEditDataChange({ ...detailEditData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Status
                </label>
                <Select
                  value={detailEditData.status || "pending"}
                  onChange={(e) =>
                    onEditDataChange({
                      ...detailEditData,
                      status: e.target.value as "pending" | "in-progress" | "completed",
                    })
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Cost ($)
                </label>
                <Input
                  type="number"
                  value={detailEditData.cost ?? ""}
                  onChange={(e) =>
                    onEditDataChange({
                      ...detailEditData,
                      cost: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Start Date
                  </label>
                  <DatePicker
                    value={detailEditData.startedDate || ""}
                    onChange={(val) => onEditDataChange({ ...detailEditData, startedDate: val })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Completed Date
                  </label>
                  <DatePicker
                    value={detailEditData.completedDate || ""}
                    onChange={(val) => onEditDataChange({ ...detailEditData, completedDate: val })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Notes
                </label>
                <Textarea
                  value={detailEditData.notes || ""}
                  onChange={(e) => onEditDataChange({ ...detailEditData, notes: e.target.value })}
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Photos
                  {detailEditData.photoUrls?.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {detailEditData.photoUrls.length}
                    </Badge>
                  )}
                </label>
                {detailEditData.photoUrls && detailEditData.photoUrls.length > 0 && (
                  <div className="mb-3">
                    <MaintenancePhotoGallery
                      photos={detailEditData.photoUrls}
                      alt={detailEditData.title || "Maintenance"}
                      onDeletePhoto={(url) => onRemovePhoto(url, "detail")}
                      showDelete={true}
                    />
                  </div>
                )}
                <label
                  className={`${
                    uploadingPhoto[selectedRecord.id] ? "pointer-events-none opacity-60" : "cursor-pointer"
                  } inline-block`}
                >
                  <div className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 transition-colors">
                    {uploadingPhoto[selectedRecord.id] ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" /> Upload Photo
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => onPhotoUpload(e, selectedRecord.id)}
                    disabled={uploadingPhoto[selectedRecord.id]}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={onSaveEdit}
                  disabled={saving || !detailEditData.vehicleId || !detailEditData.title}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" /> Save Changes
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={onCancelEdit}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Badge className={`${getStatusBadgeColor(selectedRecord.status)}`}>
                  <span
                    className={`mr-1.5 font-bold ${
                      selectedRecord.status === "pending"
                        ? "text-yellow-700"
                        : selectedRecord.status === "in-progress"
                          ? "text-blue-700"
                          : "text-green-700"
                    }`}
                    aria-hidden="true"
                  >
                    ●
                  </span>
                  {getStatusIcon(selectedRecord.status)}
                  {formatStatusLabel(selectedRecord.status)}
                </Badge>
                <span className="text-xs text-gray-400">
                  Created{" "}
                  {new Date(selectedRecord.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>

              {selectedRecord.description && (
                <div>
                  <h3 className="font-semibold text-sm text-gray-500 uppercase mb-1">Description</h3>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">{selectedRecord.description}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-sm text-gray-500 uppercase mb-1">Cost</h3>
                <p className="text-lg font-bold text-gray-900">
                  {selectedRecord.cost !== null ? (
                    `$${selectedRecord.cost.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  ) : (
                    <span className="text-gray-400 text-base font-normal">Not specified</span>
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-sm text-gray-500 uppercase mb-1">Start Date</h3>
                  <p className="text-gray-900">
                    {selectedRecord.startedDate ? (
                      new Date(selectedRecord.startedDate + "T12:00:00").toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    ) : (
                      <span className="text-gray-400">Not set</span>
                    )}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-500 uppercase mb-1">Completed</h3>
                  <p className="text-gray-900">
                    {selectedRecord.completedDate ? (
                      new Date(selectedRecord.completedDate + "T12:00:00").toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    ) : (
                      <span className="text-gray-400">Not set</span>
                    )}
                  </p>
                </div>
              </div>

              {selectedRecord.notes && (
                <div>
                  <h3 className="font-semibold text-sm text-gray-500 uppercase mb-1">Notes</h3>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                    {selectedRecord.notes}
                  </p>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-sm text-gray-500 uppercase mb-2">
                  Photos
                  {selectedRecord.photoUrls?.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      ({selectedRecord.photoUrls.length})
                    </span>
                  )}
                </h3>
                {selectedRecord.photoUrls && selectedRecord.photoUrls.length > 0 ? (
                  <MaintenancePhotoGallery
                    photos={selectedRecord.photoUrls}
                    alt={selectedRecord.title || "Maintenance"}
                    showDelete={false}
                  />
                ) : (
                  <p className="text-gray-400 text-sm flex items-center gap-1">
                    <Camera className="h-3.5 w-3.5" aria-hidden="true" /> No photos attached
                  </p>
                )}
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-gray-400">
                  Record ID:{" "}
                  <span className="font-mono text-gray-500 select-all">{selectedRecord.id}</span>
                </p>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  disabled={saving || deletingId === selectedRecord.id}
                  onClick={() => onDelete(selectedRecord.id)}
                >
                  {deletingId === selectedRecord.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete Record
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
    </StaffSidePanel>
  );
}
