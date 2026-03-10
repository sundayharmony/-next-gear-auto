"use client";

import React, { useEffect, useState } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { compressImage } from "@/lib/utils/compress-image";
import {
  Wrench,
  Plus,
  Upload,
  Trash2,
  CheckCircle,
  Clock,
  X,
  Pencil,
  Save,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { Vehicle, getVehicleDisplayName } from "@/lib/types";
import { MaintenancePhotoGallery } from "@/components/maintenance-photo-gallery";

interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  vehicleName?: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed";
  cost: number | null;
  photoUrls: string[];
  startedDate: string;
  completedDate: string;
  notes: string;
  createdAt: string;
}

const emptyRecord: Omit<MaintenanceRecord, "id" | "createdAt"> = {
  vehicleId: "",
  vehicleName: "",
  title: "",
  description: "",
  status: "pending",
  cost: null,
  photoUrls: [],
  startedDate: "",
  completedDate: "",
  notes: "",
};

interface FormState extends Omit<MaintenanceRecord, "id" | "createdAt"> {}

export default function AdminMaintenancePage() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "in-progress" | "completed">("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecord, setNewRecord] = useState<FormState>(emptyRecord);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<Record<string, boolean>>({});

  // Temp photos for new record creation (files not yet uploaded)
  const [tempNewPhotos, setTempNewPhotos] = useState<File[]>([]);

  // Detail panel state
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailEditMode, setDetailEditMode] = useState(false);
  const [detailEditData, setDetailEditData] = useState<FormState>({} as FormState);

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recordsRes, vehiclesRes] = await Promise.all([
        adminFetch("/api/admin/maintenance"),
        adminFetch("/api/admin/vehicles"),
      ]);

      const recordsData = await recordsRes.json();
      const vehiclesData = await vehiclesRes.json();

      if (recordsData.success) {
        setRecords(recordsData.data);
      } else {
        setError("Failed to load maintenance records");
      }

      if (vehiclesData.success) {
        setVehicles(vehiclesData.data);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Network error — could not load data");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter records by status
  const filteredRecords = records.filter((r) =>
    statusFilter === "all" ? true : r.status === statusFilter
  );

  // Count records by status
  const statusCounts = {
    all: records.length,
    pending: records.filter((r) => r.status === "pending").length,
    "in-progress": records.filter((r) => r.status === "in-progress").length,
    completed: records.filter((r) => r.status === "completed").length,
  };

  // Detail panel helpers
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

  const cancelDetailEdit = () => {
    setDetailEditMode(false);
  };

  const saveDetailEdit = async () => {
    if (!selectedRecord) return;
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
        setRecords((prev) =>
          prev.map((r) => (r.id === selectedRecord.id ? updatedRecord : r))
        );
        setSelectedRecord(updatedRecord);
        setDetailEditMode(false);
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

      const data = await res.json();
      if (data.success) {
        const newId = data.data?.id;

        // Upload any temporary photos to the newly created record
        if (newId && tempNewPhotos.length > 0) {
          for (const file of tempNewPhotos) {
            try {
              const formData = new FormData();
              formData.append("file", file);
              formData.append("maintenanceId", newId);
              await adminFetch("/api/admin/maintenance/upload", {
                method: "POST",
                body: formData,
              });
            } catch (err) {
              console.error("Failed to upload photo for new record:", err);
            }
          }
        }

        // Clean up temp photos object URLs
        newRecord.photoUrls.forEach((url) => {
          if (url.startsWith("blob:")) URL.revokeObjectURL(url);
        });

        setTempNewPhotos([]);
        await fetchData();
        setShowAddForm(false);
        setNewRecord(emptyRecord);
      } else {
        setError(data.message || "Failed to add record");
      }
    } catch {
      setError("Network error — could not add record");
    }
    setSaving(false);
  };

  const deleteRecord = async (id: string) => {
    if (!confirm("Are you sure you want to delete this maintenance record?")) return;
    try {
      const res = await adminFetch(`/api/admin/maintenance?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setRecords((prev) => prev.filter((r) => r.id !== id));
        // Close detail panel if we just deleted the selected record
        if (selectedRecord?.id === id) {
          closeDetail();
        }
      } else {
        setError(data.message || "Failed to delete record");
      }
    } catch {
      setError("Network error — could not delete record");
    }
  };

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    recordId: string
  ) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    // For new records, store files temporarily
    if (recordId === "new") {
      try {
        const file = await compressImage(rawFile, 4, 2048, 0.8);
        const previewUrl = URL.createObjectURL(file);
        setTempNewPhotos((prev) => [...prev, file]);
        setNewRecord((prev) => ({
          ...prev,
          photoUrls: [...prev.photoUrls, previewUrl],
        }));
      } catch (err) {
        console.error("Photo compression error:", err);
        setError("Failed to process photo");
      }
      // Reset the input so the same file can be selected again
      e.target.value = "";
      return;
    }

    setUploadingPhoto((prev) => ({ ...prev, [recordId]: true }));

    try {
      const file = await compressImage(rawFile, 4, 2048, 0.8);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("maintenanceId", recordId);

      const res = await adminFetch("/api/admin/maintenance/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        const newPhotoUrls = data.photoUrls || [];
        setRecords((prev) =>
          prev.map((r) =>
            r.id === recordId
              ? { ...r, photoUrls: newPhotoUrls.length > 0 ? newPhotoUrls : [...r.photoUrls, data.url] }
              : r
          )
        );

        // Update detail panel data if viewing/editing this record
        if (selectedRecord?.id === recordId) {
          const updatedUrls = newPhotoUrls.length > 0 ? newPhotoUrls : [...selectedRecord.photoUrls, data.url];
          setSelectedRecord((prev) => prev ? { ...prev, photoUrls: updatedUrls } : prev);
          if (detailEditMode) {
            setDetailEditData((prev) => ({ ...prev, photoUrls: updatedUrls }));
          }
        }
      } else {
        setError(data.error || "Failed to upload photo");
      }
    } catch (err) {
      console.error("Photo upload error:", err);
      setError("Network error — could not upload photo");
    } finally {
      setUploadingPhoto((prev) => ({ ...prev, [recordId]: false }));
      e.target.value = "";
    }
  };

  const removePhoto = (url: string, context: "new" | "detail") => {
    if (context === "new") {
      const idx = newRecord.photoUrls.indexOf(url);
      if (idx !== -1) {
        // Revoke blob URL and remove corresponding temp file
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
        setTempNewPhotos((prev) => prev.filter((_, i) => i !== idx));
      }
      setNewRecord((prev) => ({
        ...prev,
        photoUrls: prev.photoUrls.filter((r) => r !== url),
      }));
    } else {
      setDetailEditData((prev) => ({
        ...prev,
        photoUrls: prev.photoUrls.filter((r) => r !== url),
      }));
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-3 w-3 mr-1" />;
      case "in-progress":
        return <Wrench className="h-3 w-3 mr-1" />;
      case "completed":
        return <CheckCircle className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };

  const formatStatusLabel = (status: string) => {
    if (status === "in-progress") return "In Progress";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Render the "Add New Record" form (inline on the page)
  const renderAddForm = () => (
    <Card className="mb-6 border-purple-200">
      <CardContent className="p-6">
        <h3 className="font-semibold text-gray-900 mb-6">Add New Maintenance Record</h3>

        <div className="space-y-6">
          {/* Vehicle and Title Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Vehicle *</label>
              <select
                value={newRecord.vehicleId || ""}
                onChange={(e) => {
                  const selected = vehicles.find((v) => v.id === e.target.value);
                  setNewRecord({
                    ...newRecord,
                    vehicleId: e.target.value,
                    vehicleName: selected ? getVehicleDisplayName(selected) : "",
                  });
                }}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">Select a vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{getVehicleDisplayName(v)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Title *</label>
              <Input
                value={newRecord.title || ""}
                onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })}
                placeholder="e.g. Oil Change"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Description</label>
            <textarea
              value={newRecord.description || ""}
              onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
              placeholder="Details about the maintenance work"
              rows={3}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          {/* Status, Cost, Dates Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Status</label>
              <select
                value={newRecord.status || "pending"}
                onChange={(e) =>
                  setNewRecord({
                    ...newRecord,
                    status: e.target.value as "pending" | "in-progress" | "completed",
                  })
                }
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Estimated Cost ($)</label>
              <Input
                type="number"
                value={newRecord.cost || ""}
                onChange={(e) =>
                  setNewRecord({
                    ...newRecord,
                    cost: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Start Date</label>
              <Input
                type="date"
                value={newRecord.startedDate || ""}
                onChange={(e) => setNewRecord({ ...newRecord, startedDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Completed Date</label>
              <Input
                type="date"
                value={newRecord.completedDate || ""}
                onChange={(e) => setNewRecord({ ...newRecord, completedDate: e.target.value })}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Notes</label>
            <textarea
              value={newRecord.notes || ""}
              onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
              placeholder="Additional notes about the maintenance"
              rows={2}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          {/* Photos Section */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-2 block">Photos</label>

            {newRecord.photoUrls && newRecord.photoUrls.length > 0 && (
              <div className="mb-3">
                <MaintenancePhotoGallery
                  photos={newRecord.photoUrls}
                  alt={newRecord.title || "Maintenance"}
                  onDeletePhoto={(url) => removePhoto(url, "new")}
                  showDelete={true}
                />
              </div>
            )}

            <label className="cursor-pointer">
              <div className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">
                <Upload className="h-4 w-4" />
                Upload Photo
              </div>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => handlePhotoUpload(e, "new")}
                className="hidden"
              />
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={addRecord}
              disabled={saving || !newRecord.vehicleId || !newRecord.title}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // Clean up blob URLs
                newRecord.photoUrls.forEach((url) => {
                  if (url.startsWith("blob:")) URL.revokeObjectURL(url);
                });
                setTempNewPhotos([]);
                setShowAddForm(false);
                setNewRecord(emptyRecord);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      {/* Header Section */}
      <section className="bg-gradient-to-br from-gray-900 to-purple-900 py-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Wrench className="h-8 w-8" />
                <h1 className="text-3xl font-bold">Maintenance Records</h1>
              </div>
              <p className="mt-1 text-purple-200">Manage vehicle maintenance and repairs</p>
            </div>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-white text-purple-900 hover:bg-gray-100"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Record
            </Button>
          </div>
        </div>
      </section>

      <PageContainer className="py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 ml-3"
            >
              &times;
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900">{statusCounts.all}</div>
              <p className="text-sm text-gray-600 mt-1">Total Records</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</div>
              <p className="text-sm text-gray-600 mt-1">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{statusCounts["in-progress"]}</div>
              <p className="text-sm text-gray-600 mt-1">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{statusCounts.completed}</div>
              <p className="text-sm text-gray-600 mt-1">Completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Add Record Form */}
        {showAddForm && renderAddForm()}

        {/* Status Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(["all", "pending", "in-progress", "completed"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap ${
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

        {/* Records Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-gray-500">Loading records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {records.length === 0
                ? "No maintenance records yet. Add your first record!"
                : "No records match the current filter."}
            </p>
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Vehicle</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Title</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Cost</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Start Date</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Completed</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Photos</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => openDetail(record)}
                    >
                      <td className="px-6 py-3 max-w-[180px]">
                        <span className="font-medium text-gray-900 truncate block">
                          {record.vehicleName || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-700 max-w-[200px] truncate">{record.title}</td>
                      <td className="px-6 py-3">
                        <Badge className={getStatusBadgeColor(record.status)}>
                          {getStatusIcon(record.status)}
                          {formatStatusLabel(record.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {record.cost !== null ? `$${record.cost.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-6 py-3 text-gray-600 text-xs">
                        {record.startedDate ? new Date(record.startedDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-6 py-3 text-gray-600 text-xs">
                        {record.completedDate ? new Date(record.completedDate).toLocaleDateString() : "—"}
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
        )}
      </PageContainer>

      {/* Detail Side Panel */}
      {showDetail && selectedRecord && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/50" onClick={closeDetail} />
          {/* Panel */}
          <div className="w-full max-w-2xl bg-white shadow-xl overflow-y-auto">
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold">
                {detailEditMode ? "Edit Record" : "Maintenance Details"}
              </h2>
              <div className="flex items-center gap-2">
                {!detailEditMode && (
                  <button
                    onClick={startDetailEdit}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                )}
                <button onClick={closeDetail} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {detailEditMode ? (
                /* ========== EDIT MODE ========== */
                <>
                  {/* Vehicle */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle *</label>
                    <select
                      value={detailEditData.vehicleId || ""}
                      onChange={(e) => {
                        const selected = vehicles.find((v) => v.id === e.target.value);
                        setDetailEditData({
                          ...detailEditData,
                          vehicleId: e.target.value,
                          vehicleName: selected ? getVehicleDisplayName(selected) : "",
                        });
                      }}
                      className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                    >
                      <option value="">Select a vehicle</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>{getVehicleDisplayName(v)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                    <Input
                      value={detailEditData.title || ""}
                      onChange={(e) => setDetailEditData({ ...detailEditData, title: e.target.value })}
                      placeholder="e.g. Oil Change"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                    <textarea
                      value={detailEditData.description || ""}
                      onChange={(e) => setDetailEditData({ ...detailEditData, description: e.target.value })}
                      rows={3}
                      className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                    <select
                      value={detailEditData.status || "pending"}
                      onChange={(e) =>
                        setDetailEditData({
                          ...detailEditData,
                          status: e.target.value as "pending" | "in-progress" | "completed",
                        })
                      }
                      className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  {/* Cost */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cost ($)</label>
                    <Input
                      type="number"
                      value={detailEditData.cost || ""}
                      onChange={(e) =>
                        setDetailEditData({
                          ...detailEditData,
                          cost: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                      <Input
                        type="date"
                        value={detailEditData.startedDate || ""}
                        onChange={(e) => setDetailEditData({ ...detailEditData, startedDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Completed Date</label>
                      <Input
                        type="date"
                        value={detailEditData.completedDate || ""}
                        onChange={(e) => setDetailEditData({ ...detailEditData, completedDate: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                    <textarea
                      value={detailEditData.notes || ""}
                      onChange={(e) => setDetailEditData({ ...detailEditData, notes: e.target.value })}
                      rows={2}
                      className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                    />
                  </div>

                  {/* Photos */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Photos</label>
                    {detailEditData.photoUrls && detailEditData.photoUrls.length > 0 && (
                      <div className="mb-3">
                        <MaintenancePhotoGallery
                          photos={detailEditData.photoUrls}
                          alt={detailEditData.title || "Maintenance"}
                          onDeletePhoto={(url) => removePhoto(url, "detail")}
                          showDelete={true}
                        />
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">
                        <Upload className="h-4 w-4" />
                        {uploadingPhoto[selectedRecord.id] ? "Uploading..." : "Upload Photo"}
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => handlePhotoUpload(e, selectedRecord.id)}
                        disabled={uploadingPhoto[selectedRecord.id]}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Save / Cancel */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      onClick={saveDetailEdit}
                      disabled={saving || !detailEditData.vehicleId || !detailEditData.title}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button variant="outline" onClick={cancelDetailEdit}>
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                /* ========== VIEW MODE ========== */
                <>
                  {/* Status & ID */}
                  <div>
                    <p className="text-xs text-gray-500">Record ID</p>
                    <p className="font-mono text-purple-600 font-bold text-sm break-all">{selectedRecord.id}</p>
                    <Badge className={`mt-1 ${getStatusBadgeColor(selectedRecord.status)}`}>
                      {getStatusIcon(selectedRecord.status)}
                      {formatStatusLabel(selectedRecord.status)}
                    </Badge>
                  </div>

                  {/* Vehicle */}
                  <div>
                    <h3 className="font-semibold text-sm text-gray-500 uppercase mb-1">Vehicle</h3>
                    <p className="font-medium text-gray-900">{selectedRecord.vehicleName || "—"}</p>
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className="font-semibold text-sm text-gray-500 uppercase mb-1">Title</h3>
                    <p className="font-medium text-gray-900">{selectedRecord.title}</p>
                  </div>

                  {/* Description */}
                  {selectedRecord.description && (
                    <div>
                      <h3 className="font-semibold text-sm text-gray-500 uppercase mb-1">Description</h3>
                      <p className="text-gray-700 text-sm whitespace-pre-wrap">{selectedRecord.description}</p>
                    </div>
                  )}

                  {/* Cost */}
                  <div>
                    <h3 className="font-semibold text-sm text-gray-500 uppercase mb-1">Cost</h3>
                    <p className="text-lg font-bold text-gray-900">
                      {selectedRecord.cost !== null ? `$${selectedRecord.cost.toFixed(2)}` : "—"}
                    </p>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-sm text-gray-500 uppercase mb-1">Start Date</h3>
                      <p className="text-gray-900">
                        {selectedRecord.startedDate
                          ? new Date(selectedRecord.startedDate).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-500 uppercase mb-1">Completed</h3>
                      <p className="text-gray-900">
                        {selectedRecord.completedDate
                          ? new Date(selectedRecord.completedDate).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedRecord.notes && (
                    <div>
                      <h3 className="font-semibold text-sm text-gray-500 uppercase mb-1">Notes</h3>
                      <p className="text-gray-700 text-sm whitespace-pre-wrap">{selectedRecord.notes}</p>
                    </div>
                  )}

                  {/* Photos */}
                  <div>
                    <h3 className="font-semibold text-sm text-gray-500 uppercase mb-2">Photos</h3>
                    {selectedRecord.photoUrls && selectedRecord.photoUrls.length > 0 ? (
                      <MaintenancePhotoGallery
                        photos={selectedRecord.photoUrls}
                        alt={selectedRecord.title || "Maintenance"}
                        showDelete={false}
                      />
                    ) : (
                      <p className="text-gray-400 text-sm">No photos attached</p>
                    )}
                  </div>

                  {/* Created at */}
                  <div className="pt-4 border-t">
                    <p className="text-xs text-gray-400">
                      Created {new Date(selectedRecord.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Delete */}
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      onClick={() => deleteRecord(selectedRecord.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Record
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
