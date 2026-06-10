"use client";

import {
  Wrench,
  Upload,
  CheckCircle,
  Clock,
  X,
  DollarSign,
  Camera,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Vehicle, getVehicleDisplayName } from "@/lib/types";
import { MaintenancePhotoGallery } from "@/components/maintenance-photo-gallery";
import type { FormState } from "./maintenance-types";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  "in-progress": "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-green-100 text-green-700 border-green-200",
};

export interface MaintenanceFormModalProps {
  formRef: React.RefObject<HTMLDivElement | null>;
  newRecord: FormState;
  vehicles: Vehicle[];
  saving: boolean;
  onRecordChange: (record: FormState) => void;
  onCancel: () => void;
  onSave: () => void;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>, recordId: string) => void;
  onRemovePhoto: (url: string, context: "new" | "detail") => void;
}

export function MaintenanceFormModal({
  formRef,
  newRecord,
  vehicles,
  saving,
  onRecordChange,
  onCancel,
  onSave,
  onPhotoUpload,
  onRemovePhoto,
}: MaintenanceFormModalProps) {
  return (
    <Card className="mb-6 border-purple-200" ref={formRef}>
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 sm:px-6 py-4 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Wrench className="h-4.5 w-4.5 text-white" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-semibold text-white">New Maintenance Record</h3>
              <p className="text-white/70 text-xs mt-0.5">Log service, repairs, or inspections</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <CardContent className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <div>
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
              <Wrench className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-gray-900">Basic Information</h4>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                Vehicle <span className="text-red-500">*</span>
              </label>
              <Select
                value={newRecord.vehicleId || ""}
                onChange={(e) => {
                  const selected = vehicles.find((v) => v.id === e.target.value);
                  onRecordChange({
                    ...newRecord,
                    vehicleId: e.target.value,
                    vehicleName: selected ? getVehicleDisplayName(selected) : "",
                  });
                }}
              >
                <option value="">Select a vehicle...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{getVehicleDisplayName(v)}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                value={newRecord.title || ""}
                onChange={(e) => onRecordChange({ ...newRecord, title: e.target.value })}
                placeholder="e.g. Oil Change, Brake Inspection"
                className="focus-visible:outline-2 focus-visible:outline-purple-600"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
              Description
            </label>
            <Textarea
              value={newRecord.description || ""}
              onChange={(e) => onRecordChange({ ...newRecord, description: e.target.value })}
              placeholder="Describe the maintenance work to be performed..."
              rows={3}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-gray-900">Status & Schedule</h4>
          </div>

          <div className="mb-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 block">
              Status
            </label>
            <div className="flex gap-2">
              {([
                { value: "pending", label: "Pending", icon: Clock },
                { value: "in-progress", label: "In Progress", icon: Wrench },
                { value: "completed", label: "Completed", icon: CheckCircle },
              ] as const).map(({ value, label, icon: StatusIcon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onRecordChange({ ...newRecord, status: value })}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                    newRecord.status === value
                      ? statusColors[value] + " shadow-sm"
                      : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <StatusIcon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-green-500" /> Estimated Cost
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <Input
                  type="number"
                  value={newRecord.cost ?? ""}
                  onChange={(e) =>
                    onRecordChange({
                      ...newRecord,
                      cost: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="pl-7"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                Start Date
              </label>
              <DatePicker
                value={newRecord.startedDate || ""}
                onChange={(val) => onRecordChange({ ...newRecord, startedDate: val })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                Completed Date
              </label>
              <DatePicker
                value={newRecord.completedDate || ""}
                onChange={(val) => onRecordChange({ ...newRecord, completedDate: val })}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
            Additional Notes
          </label>
          <Textarea
            value={newRecord.notes || ""}
            onChange={(e) => onRecordChange({ ...newRecord, notes: e.target.value })}
            placeholder="Any additional notes about parts, vendor info, warranty..."
            rows={2}
          />
        </div>

        <div>
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-gray-900">Photos</h4>
              {newRecord.photoUrls.length > 0 && (
                <Badge variant="secondary" className="text-xs">{newRecord.photoUrls.length}</Badge>
              )}
            </div>
          </div>

          {newRecord.photoUrls && newRecord.photoUrls.length > 0 ? (
            <div className="mb-3">
              <MaintenancePhotoGallery
                photos={newRecord.photoUrls}
                alt={newRecord.title || "Maintenance"}
                onDeletePhoto={(url) => onRemovePhoto(url, "new")}
                showDelete={true}
              />
            </div>
          ) : (
            <div className="mb-3 p-6 border-2 border-dashed border-gray-200 rounded-xl text-center">
              <Camera className="h-8 w-8 text-gray-300 mx-auto mb-2" aria-hidden="true" />
              <p className="text-xs text-gray-400">No photos yet — document the maintenance work</p>
            </div>
          )}

          <label className="cursor-pointer inline-block">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-600 transition-colors">
              <Upload className="h-4 w-4" />
              Upload Photo
            </div>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => onPhotoUpload(e, "new")}
              className="hidden"
            />
          </label>
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
          <Button variant="outline" onClick={onCancel} className="px-5">
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={saving || !newRecord.vehicleId || !newRecord.title}
            className="bg-purple-600 hover:bg-purple-700 px-6 shadow-sm shadow-purple-200"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </span>
            ) : (
              "Save Record"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
