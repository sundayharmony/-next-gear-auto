"use client";

import React, { useEffect, useState } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Upload,
  Trash2,
  Edit,
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRecord, setNewRecord] = useState<FormState>(emptyRecord);
  const [editForm, setEditForm] = useState<FormState>({} as FormState);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<Record<string, boolean>>({});

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

  const startEdit = (record: MaintenanceRecord) => {
    setEditingId(record.id);
    setEditForm({ ...record });
  };

  const saveEdit = async () => {
    if (!editingId || !editForm) return;
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          vehicleId: editForm.vehicleId,
          title: editForm.title,
          description: editForm.description,
          status: editForm.status,
          cost: editForm.cost,
          startedDate: editForm.startedDate,
          completedDate: editForm.completedDate,
          notes: editForm.notes,
          photoUrls: editForm.photoUrls,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === editingId
              ? {
                  ...r,
                  vehicleId: editForm.vehicleId,
                  title: editForm.title,
                  description: editForm.description,
                  status: editForm.status,
                  cost: editForm.cost,
                  startedDate: editForm.startedDate,
                  completedDate: editForm.completedDate,
                  notes: editForm.notes,
                  photoUrls: editForm.photoUrls,
                }
              : r
          )
        );
        setEditingId(null);
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
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto((prev) => ({ ...prev, [recordId]: true }));

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("maintenanceId", recordId);

      const res = await adminFetch("/api/admin/maintenance/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === recordId
              ? { ...r, photoUrls: data.photoUrls || [...r.photoUrls, data.url] }
              : r
          )
        );

        // Update edit form if editing this record
        if (editingId === recordId) {
          setEditForm((prev) => ({
            ...prev,
            photoUrls: data.photoUrls || [...prev.photoUrls, data.url],
          }));
        }
      } else {
        setError(data.error || "Failed to upload photo");
      }
    } catch (err) {
      console.error("Photo upload error:", err);
      setError("Network error — could not upload photo");
    } finally {
      setUploadingPhoto((prev) => ({ ...prev, [recordId]: false }));
    }
  };

  const removePhoto = (url: string, formKey: "new" | string) => {
    if (formKey === "new") {
      setNewRecord((prev) => ({
        ...prev,
        photoUrls: prev.photoUrls.filter((r) => r !== url),
      }));
    } else {
      setEditForm((prev) => ({
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

  const renderMaintenanceForm = (
    form: FormState,
    setForm: (form: FormState) => void,
    formKey: "new" | string,
    onSave: () => void,
    onCancel: () => void,
    isSaving: boolean
  ) => (
    <Card className="mb-6 border-purple-200">
      <CardContent className="p-6">
        <h3 className="font-semibold text-gray-900 mb-6">
          {formKey === "new" ? "Add New Maintenance Record" : "Edit Maintenance Record"}
        </h3>

        <div className="space-y-6">
          {/* Vehicle and Title Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Vehicle *
              </label>
              <select
                value={form.vehicleId || ""}
                onChange={(e) => {
                  const selected = vehicles.find((v) => v.id === e.target.value);
                  setForm({
                    ...form,
                    vehicleId: e.target.value,
                    vehicleName: selected ? getVehicleDisplayName(selected) : "",
                  });
                }}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">Select a vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {getVehicleDisplayName(v)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Title *
              </label>
              <Input
                value={form.title || ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Oil Change"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              Description
            </label>
            <textarea
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Details about the maintenance work"
              rows={3}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          {/* Status, Cost, Dates Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Status
              </label>
              <select
                value={form.status || "pending"}
                onChange={(e) =>
                  setForm({
                    ...form,
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
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Estimated Cost ($)
              </label>
              <Input
                type="number"
                value={form.cost || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    cost: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Start Date
              </label>
              <Input
                type="date"
                value={form.startedDate || ""}
                onChange={(e) => setForm({ ...form, startedDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Completed Date
              </label>
              <Input
                type="date"
                value={form.completedDate || ""}
                onChange={(e) => setForm({ ...form, completedDate: e.target.value })}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              Notes
            </label>
            <textarea
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional notes about the maintenance"
              rows={2}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          {/* Photos Section */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-2 block">
              Photos
            </label>

            {(form.photoUrls && form.photoUrls.length > 0) && (
              <div className="mb-3">
                <MaintenancePhotoGallery
                  photos={form.photoUrls}
                  alt={form.title || "Maintenance"}
                  onDeletePhoto={(url) => removePhoto(url, formKey)}
                  showDelete={true}
                />
              </div>
            )}

            {formKey !== "new" && (
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">
                  <Upload className="h-4 w-4" />
                  {uploadingPhoto[formKey] ? "Uploading..." : "Upload Photo"}
                </div>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => handlePhotoUpload(e, formKey)}
                  disabled={uploadingPhoto[formKey]}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={onSave}
              disabled={isSaving || !form.vehicleId || !form.title}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button variant="outline" onClick={onCancel}>
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
              onClick={() => {
                setShowAddForm(!showAddForm);
                setEditingId(null);
              }}
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
        {showAddForm && (
          <>
            {renderMaintenanceForm(
              newRecord,
              setNewRecord,
              "new",
              addRecord,
              () => {
                setShowAddForm(false);
                setNewRecord(emptyRecord);
              },
              saving
            )}
          </>
        )}

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
              {status === "all"
                ? "All"
                : status === "in-progress"
                ? "In Progress"
                : status.charAt(0).toUpperCase() + status.slice(1)}
              {" "}
              ({status === "all" ? statusCounts.all : statusCounts[status]})
            </button>
          ))}
        </div>

        {/* Edit Form Modal */}
        {editingId && (
          <>
            {renderMaintenanceForm(
              editForm,
              setEditForm,
              editingId,
              saveEdit,
              () => setEditingId(null),
              saving
            )}
          </>
        )}

        {/* Records Table */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading records...</p>
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
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">
                      Vehicle
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">
                      Cost
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">
                      Start Date
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">
                      Completed
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">
                      Photos
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-3">
                        <span className="font-medium text-gray-900">
                          {record.vehicleName || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-700">{record.title}</td>
                      <td className="px-6 py-3">
                        <Badge className={getStatusBadgeColor(record.status)}>
                          {getStatusIcon(record.status)}
                          {record.status === "in-progress"
                            ? "In Progress"
                            : record.status.charAt(0).toUpperCase() + record.status.slice(1)}
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
                      <td className="px-6 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(record)}
                            className="text-purple-600 hover:text-purple-700 font-medium text-xs"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteRecord(record.id)}
                            className="text-red-600 hover:text-red-700 font-medium text-xs"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </PageContainer>
    </>
  );
}
