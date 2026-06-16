"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { useAutoToast } from "@/lib/hooks/useAutoToast";
import {
  Wrench,
  Plus,
  CheckCircle,
  Clock,
  X,
  DollarSign,
  AlertTriangle,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminPageHeader, AdminPageBody } from "@/components/admin/admin-shell";
import { Vehicle } from "@/lib/types";
import { logger } from "@/lib/utils/logger";
import { AdminStatusBanner } from "@/components/admin/ui-feedback";
import { adminPanelConfig, type StaffPanelConfig } from "@/lib/admin/staff-panel-config";
import {
  emptyRecord,
  type FormState,
  type MaintenanceRecord,
} from "./maintenance-types";
import { formatStatusLabel } from "./maintenance-status-utils";
import { useMaintenanceUpload } from "./use-maintenance-upload";
import { MaintenanceList } from "./maintenance-list";
import { MaintenanceFormModal } from "./maintenance-form-modal";
import { MaintenanceDetailPanel } from "./maintenance-detail-panel";

export default function AdminMaintenancePage({
  panelConfig = adminPanelConfig,
}: {
  panelConfig?: StaffPanelConfig;
}) {
  const panelBase = panelConfig.panelBase;
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const { error, setError, success, setSuccess } = useAutoToast();
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "in-progress" | "completed">("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecord, setNewRecord] = useState<FormState>(emptyRecord);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const addFormRef = useRef<HTMLDivElement>(null);

  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailEditMode, setDetailEditMode] = useState(false);
  const [detailEditData, setDetailEditData] = useState<FormState>({} as FormState);

  const {
    uploadingPhoto,
    tempNewPhotos,
    handlePhotoUpload,
    removePhoto,
    revokeTempPhotoUrls,
    resetTempPhotos,
  } = useMaintenanceUpload({
    setRecords,
    setNewRecord,
    setError,
    selectedRecord,
    setSelectedRecord,
    detailEditMode,
    setDetailEditData,
  });

  const cancelAddForm = useCallback(() => {
    revokeTempPhotoUrls(newRecord.photoUrls);
    resetTempPhotos();
    setShowAddForm(false);
    setNewRecord(emptyRecord);
  }, [newRecord.photoUrls, revokeTempPhotoUrls, resetTempPhotos]);

  useEffect(() => {
    if (showAddForm && addFormRef.current) {
      addFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showAddForm]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || saving) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        (e.target as HTMLElement).blur();
        return;
      }
      if (showDetail) {
        if (detailEditMode) {
          setDetailEditMode(false);
        } else {
          closeDetail();
        }
      } else if (showAddForm) {
        cancelAddForm();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showDetail, detailEditMode, showAddForm, saving, cancelAddForm]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recordsRes, vehiclesRes] = await Promise.all([
        adminFetch("/api/admin/maintenance"),
        adminFetch("/api/admin/vehicles"),
      ]);

      if (!recordsRes.ok || !vehiclesRes.ok) throw new Error("Failed to fetch");
      const recordsData = await recordsRes.json();
      const vehiclesData = await vehiclesRes.json();

      if (recordsData?.success && Array.isArray(recordsData.data)) {
        setRecords(recordsData.data);
      } else {
        setError("Failed to load maintenance records");
      }

      if (vehiclesData?.success && Array.isArray(vehiclesData.data)) {
        setVehicles(vehiclesData.data);
      }
    } catch (err) {
      logger.error("Failed to fetch data:", err);
      setError("Network error — could not load data");
    }
    setLoading(false);
  }, [setError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = records.filter((r) => {
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesSearch =
        !q ||
        [r.title, r.description, r.vehicleName, r.notes].some((field) =>
          field?.toLowerCase().includes(q)
        );
      return matchesStatus && matchesSearch;
    });

    if (statusFilter !== "all") return filtered;

    const statusOrder: Record<MaintenanceRecord["status"], number> = {
      pending: 0,
      "in-progress": 1,
      completed: 2,
    };

    return [...filtered].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  }, [records, statusFilter, searchQuery]);

  const totalCost = useMemo(
    () => records.reduce((sum, r) => sum + (r.cost || 0), 0),
    [records]
  );

  const statusCounts = useMemo(
    () => ({
      all: records.length,
      pending: records.filter((r) => r.status === "pending").length,
      "in-progress": records.filter((r) => r.status === "in-progress").length,
      completed: records.filter((r) => r.status === "completed").length,
    }),
    [records]
  );

  const openDetail = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setShowDetail(true);
    setDetailEditMode(false);
  };

  const closeDetail = () => {
    setShowDetail(false);
    setDetailEditMode(false);
    setSelectedRecord(null);
  };

  const startDetailEdit = () => {
    if (!selectedRecord) return;
    setDetailEditData({ ...selectedRecord });
    setDetailEditMode(true);
  };

  const saveDetailEdit = async () => {
    if (!selectedRecord) return;
    if (!detailEditData.title?.trim()) {
      setError("Title is required");
      return;
    }
    if (detailEditData.cost !== null && detailEditData.cost !== undefined && detailEditData.cost < 0) {
      setError("Cost cannot be negative");
      return;
    }
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRecord.id,
          vehicleId: detailEditData.vehicleId,
          title: detailEditData.title,
          description: detailEditData.description,
          status: detailEditData.status,
          cost: detailEditData.cost,
          startedDate: detailEditData.startedDate,
          completedDate: detailEditData.completedDate,
          notes: detailEditData.notes,
          photoUrls: detailEditData.photoUrls,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        const updatedRecord: MaintenanceRecord = {
          ...selectedRecord,
          vehicleId: detailEditData.vehicleId,
          vehicleName: detailEditData.vehicleName,
          title: detailEditData.title,
          description: detailEditData.description,
          status: detailEditData.status,
          cost: detailEditData.cost,
          startedDate: detailEditData.startedDate,
          completedDate: detailEditData.completedDate,
          notes: detailEditData.notes,
          photoUrls: detailEditData.photoUrls,
        };
        setRecords((prev) => prev.map((r) => (r.id === selectedRecord.id ? updatedRecord : r)));
        setSelectedRecord(updatedRecord);
        setDetailEditMode(false);
        setSuccess("Maintenance record updated successfully");
      } else {
        setError(data.message || "Failed to save changes");
      }
    } catch {
      setError("Network error — could not save changes");
    }
    setSaving(false);
  };

  const addRecord = async () => {
    if (!newRecord.vehicleId || !newRecord.title) {
      setError("Vehicle and Title are required");
      return;
    }
    if (newRecord.cost !== null && newRecord.cost !== undefined && newRecord.cost < 0) {
      setError("Cost cannot be negative");
      return;
    }
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: newRecord.vehicleId,
          title: newRecord.title,
          description: newRecord.description,
          status: newRecord.status,
          cost: newRecord.cost,
          startedDate: newRecord.startedDate || null,
          completedDate: newRecord.completedDate || null,
          notes: newRecord.notes,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        const newId = data.data?.id;

        let failedUploads = 0;
        if (newId && tempNewPhotos.length > 0) {
          for (const file of tempNewPhotos) {
            try {
              const formData = new FormData();
              formData.append("file", file);
              formData.append("maintenanceId", newId);
              const uploadRes = await adminFetch("/api/admin/maintenance/upload", {
                method: "POST",
                body: formData,
              });
              if (!uploadRes.ok) failedUploads++;
            } catch (err) {
              logger.error("Failed to upload photo for new record:", err);
              failedUploads++;
            }
          }
        }

        revokeTempPhotoUrls(newRecord.photoUrls);
        resetTempPhotos();
        await fetchData();
        setShowAddForm(false);
        setNewRecord(emptyRecord);

        if (failedUploads > 0) {
          setError(
            `Record saved, but ${failedUploads} photo${failedUploads > 1 ? "s" : ""} failed to upload`
          );
        } else {
          setSuccess("Maintenance record created successfully");
        }
      } else {
        setError(data.message || "Failed to add record");
      }
    } catch {
      setError("Network error — could not add record");
    }
    setSaving(false);
  };

  const deleteRecord = async (id: string) => {
    const record = records.find((r) => r.id === id);
    const label = record
      ? `"${record.title}" for ${record.vehicleName || "unknown vehicle"}`
      : "this record";
    if (!confirm(`Are you sure you want to delete ${label}?`)) return;
    setDeletingId(id);
    try {
      const res = await adminFetch(`/api/admin/maintenance?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setRecords((prev) => prev.filter((r) => r.id !== id));
        if (selectedRecord?.id === id) {
          closeDetail();
        }
        setSuccess("Maintenance record deleted successfully");
      } else {
        setError(data.message || "Failed to delete record");
      }
    } catch {
      setError("Network error — could not delete record");
    }
    setDeletingId(null);
  };

  return (
    <>
      <AdminPageHeader
        title="Maintenance Records"
        subtitle="Manage vehicle maintenance and repairs"
        actions={
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-white text-purple-900 hover:bg-purple-50"
            aria-expanded={showAddForm}
          >
            {showAddForm ? (
              <>
                <X className="h-4 w-4 mr-2" /> Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" /> Add Record
              </>
            )}
          </Button>
        }
      />

      <AdminPageBody className="py-8">
        <div aria-live="assertive">
          {error ? <AdminStatusBanner type="error" message={error} onDismiss={() => setError(null)} /> : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2">
                <Wrench className="h-5 w-5 text-purple-600" aria-hidden="true" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{statusCounts.all}</div>
                <p className="text-sm text-gray-600">Total Records</p>
              </div>
            </CardContent>
          </Card>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-yellow-100 p-2">
                <Clock className="h-5 w-5 text-yellow-600" aria-hidden="true" />
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</div>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <AlertTriangle className="h-5 w-5 text-blue-600" aria-hidden="true" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{statusCounts["in-progress"]}</div>
                <p className="text-sm text-gray-600">In Progress</p>
              </div>
            </CardContent>
          </Card>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2">
                <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{statusCounts.completed}</div>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-gray-100 p-2">
                <DollarSign className="h-5 w-5 text-gray-600" aria-hidden="true" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-sm text-gray-600">Total Cost</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {showAddForm && (
          <MaintenanceFormModal
            formRef={addFormRef}
            newRecord={newRecord}
            vehicles={vehicles}
            saving={saving}
            onRecordChange={setNewRecord}
            onCancel={cancelAddForm}
            onSave={addRecord}
            onPhotoUpload={handlePhotoUpload}
            onRemovePhoto={removePhoto}
          />
        )}

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search records..."
              className="pl-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {(["all", "pending", "in-progress", "completed"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                aria-pressed={statusFilter === status}
                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                  statusFilter === status
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {status === "all" ? "All" : formatStatusLabel(status)}{" "}
                ({status === "all" ? statusCounts.all : statusCounts[status]})
              </button>
            ))}
          </div>
        </div>

        {!loading && filteredRecords.length > 0 && (
          <p className="text-xs text-gray-500 mb-3">
            Showing {filteredRecords.length} of {records.length} record{records.length !== 1 ? "s" : ""}
            {searchQuery && <> matching &ldquo;{searchQuery}&rdquo;</>}
          </p>
        )}

        <MaintenanceList
          loading={loading}
          records={records}
          filteredRecords={filteredRecords}
          searchQuery={searchQuery}
          panelBase={panelBase}
          onOpenDetail={openDetail}
        />
      </AdminPageBody>

      {showDetail && selectedRecord && (
        <MaintenanceDetailPanel
          selectedRecord={selectedRecord}
          detailEditMode={detailEditMode}
          detailEditData={detailEditData}
          vehicles={vehicles}
          panelBase={panelBase}
          saving={saving}
          deletingId={deletingId}
          uploadingPhoto={uploadingPhoto}
          onClose={closeDetail}
          onStartEdit={startDetailEdit}
          onCancelEdit={() => setDetailEditMode(false)}
          onSaveEdit={saveDetailEdit}
          onDelete={deleteRecord}
          onEditDataChange={setDetailEditData}
          onPhotoUpload={handlePhotoUpload}
          onRemovePhoto={removePhoto}
        />
      )}
    </>
  );
}
