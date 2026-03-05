"use client";

import React, { useEffect, useState } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import {
  Car,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  RefreshCw,
  Upload,
  Wrench,
  Eye,
  Search,
  Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { Vehicle, VehicleCategory, getVehicleDisplayName } from "@/lib/types";

const CATEGORIES: VehicleCategory[] = [
  "compact",
  "sedan",
  "suv",
  "truck",
  "luxury",
  "van",
];

const TRANSMISSION_OPTIONS = ["Automatic", "Manual"] as const;
const FUEL_TYPE_OPTIONS = ["Gasoline", "Diesel", "Hybrid", "Electric"] as const;
const MAINTENANCE_STATUS_OPTIONS = [
  "good",
  "needs-service",
  "in-maintenance",
] as const;

const emptyVehicle: Omit<Vehicle, "id"> = {
  year: new Date().getFullYear(),
  make: "",
  model: "",
  category: "sedan",
  images: [],
  specs: {
    passengers: 5,
    luggage: 2,
    transmission: "Automatic",
    fuelType: "Gasoline",
    mpg: 30,
    doors: 4,
  },
  dailyRate: 50,
  purchasePrice: 0,
  features: [],
  isAvailable: true,
  description: "",
  color: "White",
  mileage: 0,
  licensePlate: "",
  vin: "",
  maintenanceStatus: "good",
};

interface FormState extends Omit<Vehicle, "id"> {
  featureInput?: string;
}

export default function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>({} as FormState);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVehicle, setNewVehicle] = useState<FormState>(emptyVehicle);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<{
    [key: string]: boolean;
  }>({});
  const [source, setSource] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<VehicleCategory | "">("");

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/vehicles");
      const data = await res.json();
      if (data.success) {
        setVehicles(data.data);
        setSource(data.source);
      } else {
        setError("Failed to load vehicles");
      }
    } catch (err) {
      console.error("Failed to fetch vehicles:", err);
      setError("Network error — could not load vehicles");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // Compute stats
  const stats = {
    total: vehicles.length,
    available: vehicles.filter((v) => v.isAvailable).length,
    inMaintenance: vehicles.filter((v) => v.maintenanceStatus === "in-maintenance").length,
    avgRate:
      vehicles.length > 0
        ? Math.round(
            vehicles.reduce((sum, v) => sum + v.dailyRate, 0) / vehicles.length
          )
        : 0,
  };

  // Filter vehicles
  const filteredVehicles = vehicles.filter((v) => {
    const displayName = getVehicleDisplayName(v).toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      displayName.includes(searchQuery.toLowerCase()) ||
      v.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.model.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      filterCategory === "" || v.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    formKey: "new" | string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage((prev) => ({ ...prev, [formKey]: true }));

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (formKey !== "new") {
        formData.append("vehicleId", formKey);
      }

      const res = await adminFetch("/api/admin/vehicles/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        const imageUrl = data.url;
        if (formKey === "new") {
          setNewVehicle((prev) => ({
            ...prev,
            images: [...(prev.images || []), imageUrl],
          }));
        } else {
          setEditForm((prev) => ({
            ...prev,
            images: [...(prev.images || []), imageUrl],
          }));
        }
      } else {
        setError("Failed to upload image");
      }
    } catch (err) {
      console.error("Image upload error:", err);
      setError("Network error — could not upload image");
    } finally {
      setUploadingImage((prev) => ({ ...prev, [formKey]: false }));
    }
  };

  const toggleAvailability = async (vehicle: Vehicle) => {
    try {
      const res = await adminFetch("/api/admin/vehicles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: vehicle.id,
          isAvailable: !vehicle.isAvailable,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setVehicles((prev) =>
          prev.map((v) =>
            v.id === vehicle.id
              ? { ...v, isAvailable: !v.isAvailable }
              : v
          )
        );
      } else {
        setError(data.message || "Failed to update availability");
      }
    } catch {
      setError("Network error — could not update availability");
    }
  };

  const startEdit = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setEditForm({ ...vehicle });
  };

  const saveEdit = async () => {
    if (!editingId || !editForm) return;
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/vehicles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          year: editForm.year,
          make: editForm.make,
          model: editForm.model,
          category: editForm.category,
          images: editForm.images,
          specs: editForm.specs,
          dailyRate: editForm.dailyRate,
          features: editForm.features,
          isAvailable: editForm.isAvailable,
          description: editForm.description,
          color: editForm.color,
          mileage: editForm.mileage,
          licensePlate: editForm.licensePlate,
          vin: editForm.vin,
          maintenanceStatus: editForm.maintenanceStatus,
          purchasePrice: editForm.purchasePrice,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setVehicles((prev) =>
          prev.map((v) =>
            v.id === editingId
              ? {
                  ...v,
                  year: editForm.year || v.year,
                  make: editForm.make || v.make,
                  model: editForm.model || v.model,
                  category: editForm.category || v.category,
                  images: editForm.images || v.images,
                  specs: editForm.specs || v.specs,
                  dailyRate: editForm.dailyRate || v.dailyRate,
                  features: editForm.features || v.features,
                  isAvailable: editForm.isAvailable !== undefined ? editForm.isAvailable : v.isAvailable,
                  description: editForm.description || v.description,
                  color: editForm.color || v.color,
                  mileage: editForm.mileage !== undefined ? editForm.mileage : v.mileage,
                  licensePlate: editForm.licensePlate || v.licensePlate,
                  vin: editForm.vin || v.vin,
                  maintenanceStatus: editForm.maintenanceStatus || v.maintenanceStatus,
                  purchasePrice: editForm.purchasePrice !== undefined ? editForm.purchasePrice : v.purchasePrice,
                }
              : v
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

  const addVehicle = async () => {
    if (!newVehicle.make || !newVehicle.model) {
      setError("Make and Model are required");
      return;
    }
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: newVehicle.year,
          make: newVehicle.make,
          model: newVehicle.model,
          category: newVehicle.category,
          images: newVehicle.images || [],
          specs: newVehicle.specs,
          dailyRate: newVehicle.dailyRate,
          features: newVehicle.features || [],
          isAvailable: newVehicle.isAvailable,
          description: newVehicle.description,
          color: newVehicle.color,
          mileage: newVehicle.mileage,
          licensePlate: newVehicle.licensePlate,
          vin: newVehicle.vin,
          maintenanceStatus: newVehicle.maintenanceStatus,
          purchasePrice: newVehicle.purchasePrice,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchVehicles();
        setShowAddForm(false);
        setNewVehicle(emptyVehicle);
      } else {
        setError(data.message || "Failed to add vehicle");
      }
    } catch {
      setError("Network error — could not add vehicle");
    }
    setSaving(false);
  };

  const deleteVehicle = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;
    try {
      const res = await adminFetch(`/api/admin/vehicles?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setVehicles((prev) => prev.filter((v) => v.id !== id));
      } else {
        setError(data.message || "Failed to delete vehicle");
      }
    } catch {
      setError("Network error — could not delete vehicle");
    }
  };

  const removeImage = (url: string, formKey: "new" | string) => {
    if (formKey === "new") {
      setNewVehicle((prev) => ({
        ...prev,
        images: (prev.images || []).filter((img) => img !== url),
      }));
    } else {
      setEditForm((prev) => ({
        ...prev,
        images: (prev.images || []).filter((img) => img !== url),
      }));
    }
  };

  const addFeature = (formKey: "new" | string, featureInput: string) => {
    if (!featureInput.trim()) return;

    if (formKey === "new") {
      setNewVehicle((prev) => ({
        ...prev,
        features: [...(prev.features || []), featureInput.trim()],
        featureInput: "",
      }));
    } else {
      setEditForm((prev) => ({
        ...prev,
        features: [...(prev.features || []), featureInput.trim()],
        featureInput: "",
      }));
    }
  };

  const removeFeature = (index: number, formKey: "new" | string) => {
    if (formKey === "new") {
      setNewVehicle((prev) => ({
        ...prev,
        features: (prev.features || []).filter((_, i) => i !== index),
      }));
    } else {
      setEditForm((prev) => ({
        ...prev,
        features: (prev.features || []).filter((_, i) => i !== index),
      }));
    }
  };

  const renderVehicleForm = (
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
          {formKey === "new" ? "Add New Vehicle" : "Edit Vehicle"}
        </h3>

        <div className="space-y-6">
          {/* Year Make Model Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Year
              </label>
              <Input
                type="number"
                value={form.year || ""}
                onChange={(e) =>
                  setForm({ ...form, year: Number(e.target.value) })
                }
                min="1990"
                max={new Date().getFullYear() + 1}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Make
              </label>
              <Input
                value={form.make || ""}
                onChange={(e) => setForm({ ...form, make: e.target.value })}
                placeholder="e.g. Toyota"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Model
              </label>
              <Input
                value={form.model || ""}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="e.g. Camry"
              />
            </div>
          </div>

          {/* Category Pricing Availability Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Category
              </label>
              <select
                value={form.category || "sedan"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category: e.target.value as VehicleCategory,
                  })
                }
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Daily Rate ($)
              </label>
              <Input
                type="number"
                value={form.dailyRate || 0}
                onChange={(e) =>
                  setForm({ ...form, dailyRate: Number(e.target.value) })
                }
                min="0"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Purchase Price ($)
              </label>
              <Input
                type="number"
                value={form.purchasePrice || 0}
                onChange={(e) =>
                  setForm({ ...form, purchasePrice: Number(e.target.value) })
                }
                min="0"
                step="100"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Available
              </label>
              <select
                value={form.isAvailable ? "yes" : "no"}
                onChange={(e) =>
                  setForm({ ...form, isAvailable: e.target.value === "yes" })
                }
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="yes">Available</option>
                <option value="no">Unavailable</option>
              </select>
            </div>
          </div>

          {/* Color License Plate VIN Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Color
              </label>
              <Input
                value={form.color || ""}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="e.g. White"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                License Plate
              </label>
              <Input
                value={form.licensePlate || ""}
                onChange={(e) =>
                  setForm({ ...form, licensePlate: e.target.value })
                }
                placeholder="ABC-1234"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                VIN
              </label>
              <Input
                value={form.vin || ""}
                onChange={(e) => setForm({ ...form, vin: e.target.value })}
                placeholder="Vehicle ID Number"
              />
            </div>
          </div>

          {/* Mileage Maintenance Status Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Mileage
              </label>
              <Input
                type="number"
                value={form.mileage || 0}
                onChange={(e) =>
                  setForm({ ...form, mileage: Number(e.target.value) })
                }
                min="0"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Maintenance Status
              </label>
              <select
                value={form.maintenanceStatus || "good"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maintenanceStatus: e.target.value as
                      | "good"
                      | "needs-service"
                      | "in-maintenance",
                  })
                }
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="good">Good</option>
                <option value="needs-service">Needs Service</option>
                <option value="in-maintenance">In Maintenance</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              Description
            </label>
            <textarea
              value={form.description || ""}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Brief description of the vehicle"
              rows={3}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          {/* Images Section */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-2 block">
              Images
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {(form.images || []).map((img, idx) => (
                <div
                  key={idx}
                  className="relative w-24 h-24 rounded-lg border border-gray-200 overflow-hidden bg-gray-50"
                >
                  <img
                    src={img}
                    alt={`Vehicle ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(img, formKey)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">
                  <Upload className="h-4 w-4" />
                  {uploadingImage[formKey] ? "Uploading..." : "Upload Image"}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, formKey)}
                  disabled={uploadingImage[formKey]}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Features Section */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-2 block">
              Features
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {(form.features || []).map((feature, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {feature}
                  <button
                    type="button"
                    onClick={() => removeFeature(idx, formKey)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={form.featureInput || ""}
                onChange={(e) =>
                  setForm({ ...form, featureInput: e.target.value })
                }
                placeholder="e.g. Leather seats, GPS"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFeature(formKey, form.featureInput || "");
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  addFeature(formKey, form.featureInput || "")
                }
              >
                Add
              </Button>
            </div>
          </div>

          {/* Specs Grid */}
          <div className="border-t pt-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">
              Vehicle Specifications
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Passengers
                </label>
                <Input
                  type="number"
                  value={form.specs?.passengers || 5}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      specs: {
                        ...form.specs!,
                        passengers: Number(e.target.value),
                      },
                    })
                  }
                  min="1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Luggage
                </label>
                <Input
                  type="number"
                  value={form.specs?.luggage || 2}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      specs: {
                        ...form.specs!,
                        luggage: Number(e.target.value),
                      },
                    })
                  }
                  min="0"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Doors
                </label>
                <Input
                  type="number"
                  value={form.specs?.doors || 4}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      specs: {
                        ...form.specs!,
                        doors: Number(e.target.value),
                      },
                    })
                  }
                  min="2"
                  max="5"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Transmission
                </label>
                <select
                  value={form.specs?.transmission || "Automatic"}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      specs: {
                        ...form.specs!,
                        transmission: e.target.value as
                          | "Automatic"
                          | "Manual",
                      },
                    })
                  }
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                >
                  {TRANSMISSION_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Fuel Type
                </label>
                <select
                  value={form.specs?.fuelType || "Gasoline"}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      specs: {
                        ...form.specs!,
                        fuelType: e.target.value as
                          | "Gasoline"
                          | "Diesel"
                          | "Hybrid"
                          | "Electric",
                      },
                    })
                  }
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                >
                  {FUEL_TYPE_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  MPG
                </label>
                <Input
                  type="number"
                  value={form.specs?.mpg || 30}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      specs: {
                        ...form.specs!,
                        mpg: Number(e.target.value),
                      },
                    })
                  }
                  min="5"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={onSave}
              disabled={isSaving || !form.make || !form.model}
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
              <h1 className="text-3xl font-bold">Fleet Management</h1>
              <p className="mt-1 text-purple-200">
                Manage your rental vehicle fleet
                {source === "json" ? " (from static data)" : ""}
              </p>
            </div>
            <Button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setEditingId(null);
              }}
              className="bg-white text-purple-900 hover:bg-gray-100"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Vehicle
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
              <div className="text-2xl font-bold text-gray-900">
                {stats.total}
              </div>
              <p className="text-sm text-gray-600 mt-1">Total Vehicles</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {stats.available}
              </div>
              <p className="text-sm text-gray-600 mt-1">Available</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.inMaintenance}
              </div>
              <p className="text-sm text-gray-600 mt-1">In Maintenance</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                ${stats.avgRate}
              </div>
              <p className="text-sm text-gray-600 mt-1">Avg Daily Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Add Vehicle Form */}
        {showAddForm && (
          <>
            {renderVehicleForm(
              newVehicle,
              setNewVehicle,
              "new",
              addVehicle,
              () => {
                setShowAddForm(false);
                setNewVehicle(emptyVehicle);
              },
              saving
            )}
          </>
        )}

        {/* Search and Filter */}
        <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by make, model, or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filterCategory}
              onChange={(e) =>
                setFilterCategory(e.target.value as VehicleCategory | "")
              }
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchVehicles}
            disabled={loading}
            className="whitespace-nowrap"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* Edit Form Modal */}
        {editingId && (
          <>
            {renderVehicleForm(
              editForm,
              setEditForm,
              editingId,
              saveEdit,
              () => setEditingId(null),
              saving
            )}
          </>
        )}

        {/* Vehicles Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading vehicles...</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="text-center py-12">
            <Car className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {vehicles.length === 0
                ? "No vehicles yet. Add your first vehicle!"
                : "No vehicles match your search."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredVehicles.map((vehicle) => (
              <Card key={vehicle.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Image */}
                <div className="relative h-48 bg-gray-100 overflow-hidden">
                  {vehicle.images && vehicle.images.length > 0 ? (
                    <img
                      src={vehicle.images[0]}
                      alt={getVehicleDisplayName(vehicle)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                      <Car className="h-16 w-16 text-gray-400" />
                    </div>
                  )}

                  {/* Status Badges Overlay */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Badge
                      className={
                        vehicle.isAvailable
                          ? "bg-green-500"
                          : "bg-red-500"
                      }
                    >
                      {vehicle.isAvailable ? "Available" : "Unavailable"}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <CardContent className="p-4">
                  {/* Title */}
                  <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                    {getVehicleDisplayName(vehicle)}
                  </h3>

                  {/* Category and Color */}
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary">{vehicle.category}</Badge>
                    <div
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{
                        backgroundColor:
                          vehicle.color === "White"
                            ? "#FFFFFF"
                            : vehicle.color === "Black"
                            ? "#000000"
                            : vehicle.color === "Silver"
                            ? "#C0C0C0"
                            : vehicle.color === "Gray"
                            ? "#808080"
                            : vehicle.color === "Blue"
                            ? "#0000FF"
                            : vehicle.color === "Red"
                            ? "#FF0000"
                            : "#666666",
                      }}
                      title={vehicle.color}
                    />
                    <span className="text-xs text-gray-600">{vehicle.color}</span>
                  </div>

                  {/* Pricing */}
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <div className="text-lg font-bold text-purple-600">
                        ${vehicle.dailyRate}
                      </div>
                      <div className="text-xs text-gray-600">Daily Rate</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-gray-700">
                        ${(vehicle.purchasePrice || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Purchase Price</div>
                    </div>
                  </div>

                  {/* Mileage and Specs */}
                  <div className="space-y-1 mb-3 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Mileage:</span>
                      <span className="font-medium">
                        {vehicle.mileage.toLocaleString()} miles
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Passengers:</span>
                      <span className="font-medium">
                        {vehicle.specs.passengers}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transmission:</span>
                      <span className="font-medium">
                        {vehicle.specs.transmission}
                      </span>
                    </div>
                  </div>

                  {/* Maintenance Status */}
                  <div className="mb-4 flex items-center gap-2">
                    <Wrench className="h-3 w-3 text-gray-600" />
                    <Badge
                      variant="outline"
                      className={
                        vehicle.maintenanceStatus === "good"
                          ? "text-green-600 border-green-300 bg-green-50"
                          : vehicle.maintenanceStatus === "needs-service"
                          ? "text-yellow-600 border-yellow-300 bg-yellow-50"
                          : "text-red-600 border-red-300 bg-red-50"
                      }
                    >
                      {vehicle.maintenanceStatus === "good"
                        ? "Good"
                        : vehicle.maintenanceStatus === "needs-service"
                        ? "Needs Service"
                        : "In Maintenance"}
                    </Badge>
                  </div>

                  {/* Features Tags */}
                  {vehicle.features && vehicle.features.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-1">
                      {vehicle.features.slice(0, 3).map((feature, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-xs"
                        >
                          {feature}
                        </Badge>
                      ))}
                      {vehicle.features.length > 3 && (
                        <Badge
                          variant="secondary"
                          className="text-xs"
                        >
                          +{vehicle.features.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* License Plate and VIN */}
                  <div className="mb-4 text-xs text-gray-500 space-y-1">
                    <div>
                      <span className="font-medium">License Plate:</span>{" "}
                      {vehicle.licensePlate || "—"}
                    </div>
                    <div>
                      <span className="font-medium">VIN:</span>{" "}
                      {vehicle.vin ? vehicle.vin.slice(-6) : "—"}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => startEdit(vehicle)}
                    >
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleAvailability(vehicle)}
                      className="flex-1"
                    >
                      {vehicle.isAvailable ? (
                        <>
                          <X className="h-3 w-3 mr-1" /> Unavailable
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3 mr-1" /> Available
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => deleteVehicle(vehicle.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </PageContainer>
    </>
  );
}
