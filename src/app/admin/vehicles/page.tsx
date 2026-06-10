"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAutoToast } from "@/lib/hooks/useAutoToast";
import { adminFetch } from "@/lib/utils/admin-fetch";
import {
  Car,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  RefreshCw,
  Wrench,
  Search,
  Filter,
  ImageIcon,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Loader2,
  EyeOff,
  Fuel,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AdminPageHeader, AdminPageBody } from "@/components/admin/admin-shell";
import { AdminStatusBanner } from "@/components/admin/ui-feedback";
import {
  VehicleImageManager,
  cleanupTempVehicleImages,
} from "@/components/admin/vehicle-image-manager";
import { Vehicle, VehicleCategory, getVehicleDisplayName } from "@/lib/types";
import { getStaffVehicleDetailsHref } from "@/lib/admin/staff-vehicle-links";
import { logger } from "@/lib/utils/logger";
import { VehicleFilters } from "./vehicle-filters";
import { VehicleList } from "./vehicle-list";

const CATEGORIES: VehicleCategory[] = [
  "compact",
  "sedan",
  "suv",
  "truck",
  "luxury",
  "van",
];

const CURRENT_YEAR = new Date().getFullYear();
const MAX_VEHICLE_YEAR = CURRENT_YEAR + 1;
const TRANSMISSION_OPTIONS = ["Automatic", "Manual"] as const;
const FUEL_TYPE_OPTIONS = ["Gasoline", "Diesel", "Hybrid", "Electric"] as const;
const COLOR_HEX_MAP: Record<string, string> = {
  White: "#FFFFFF",
  Black: "#000000",
  Silver: "#C0C0C0",
  Gray: "#808080",
  Grey: "#808080",
  Blue: "#3B82F6",
  Red: "#EF4444",
  Green: "#22C55E",
  Yellow: "#EAB308",
  Orange: "#F97316",
  Brown: "#92400E",
  Beige: "#D4C5A9",
  Gold: "#CA8A04",
  Navy: "#1E3A5F",
  Maroon: "#7F1D1D",
  Purple: "#9333EA",
};

const emptyVehicle: Omit<Vehicle, "id"> = {
  year: CURRENT_YEAR,
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
  dailyRate: 0,
  purchasePrice: 0,
  features: [],
  isAvailable: true,
  isPublished: true,
  description: "",
  color: "White",
  mileage: 0,
  licensePlate: "",
  vin: "",
  maintenanceStatus: "good",
  isFinanced: false,
  monthlyPayment: 0,
  paymentDayOfMonth: 1,
  financingStartDate: "",
};

interface FormState extends Omit<Vehicle, "id"> {
  featureInput?: string;
}

export default function AdminVehiclesPage() {
  const pathname = usePathname();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>({ ...emptyVehicle });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVehicle, setNewVehicle] = useState<FormState>(emptyVehicle);
  const [saving, setSaving] = useState(false);
  const { error, setError, success, setSuccess } = useAutoToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<VehicleCategory | "">("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const editFormRef = useRef<HTMLDivElement>(null);

  const fetchVehicles = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/vehicles", { signal });
      if (!res.ok) {
        // Try to extract a specific error message from the response
        let msg = `HTTP ${res.status}`;
        try {
          const errData = await res.json();
          if (errData.message) msg = errData.message;
        } catch {
          // Response wasn't JSON — use default HTTP status message
        }
        throw new Error(msg);
      }
      const data = await res.json();
      if (data.success) {
        setVehicles(data.data);
      } else {
        setError(data.message || "Failed to load vehicles");
      }
    } catch (err) {
      // Don't set error state if the request was intentionally aborted
      if (err instanceof DOMException && err.name === "AbortError") return;
      logger.error("Failed to fetch vehicles:", err);
      setError(
        err instanceof Error && err.message !== "Failed to fetch"
          ? `Failed to load vehicles: ${err.message}`
          : "Network error — could not load vehicles"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchVehicles(controller.signal);
    return () => controller.abort();
  }, []);

  const cancelAddForm = () => {
    void cleanupTempVehicleImages(newVehicle.images || []);
    setShowAddForm(false);
    setNewVehicle(emptyVehicle);
  };

  const syncVehicleImagesInList = (vehicleId: string, images: string[]) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === vehicleId ? { ...v, images } : v))
    );
  };

  // Close forms on Escape key (only when not focused on an input)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || saving) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        // Blur the field instead of closing the form
        (e.target as HTMLElement).blur();
        return;
      }
      if (editingId) {
        setEditingId(null);
      } else if (showAddForm) {
        cancelAddForm();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editingId, showAddForm, saving, newVehicle.images]);

  // Compute stats (memoized to avoid 3 array filters + reduce per render)
  const stats = useMemo(() => ({
    total: vehicles.length,
    available: vehicles.filter((v) => v.isAvailable).length,
    inMaintenance: vehicles.filter((v) => v.maintenanceStatus === "in-maintenance" || v.maintenanceStatus === "needs-service").length,
    avgRate:
      vehicles.length > 0
        ? Math.round(
            vehicles.reduce((sum, v) => sum + v.dailyRate, 0) / vehicles.length
          )
        : 0,
  }), [vehicles]);

  // Filter vehicles (memoized to avoid re-filtering on unrelated state changes)
  const filteredVehicles = useMemo(() => vehicles.filter((v) => {
    const q = searchQuery.toLowerCase();
    const displayName = getVehicleDisplayName(v).toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      displayName.includes(q) ||
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      (v.color && v.color.toLowerCase().includes(q)) ||
      (v.licensePlate && v.licensePlate.toLowerCase().includes(q)) ||
      (v.vin && v.vin.toLowerCase().includes(q));

    const matchesCategory =
      filterCategory === "" || v.category === filterCategory;

    return matchesSearch && matchesCategory;
  }), [vehicles, searchQuery, filterCategory]);

  const toggleAvailability = async (vehicle: Vehicle) => {
    setTogglingId(vehicle.id);
    try {
      const res = await adminFetch("/api/admin/vehicles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: vehicle.id,
          isAvailable: !vehicle.isAvailable,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setVehicles((prev) =>
          prev.map((v) =>
            v.id === vehicle.id
              ? { ...v, isAvailable: !v.isAvailable }
              : v
          )
        );
        setSuccess(
          `${getVehicleDisplayName(vehicle)} marked as ${!vehicle.isAvailable ? "available" : "unavailable"}`
        );
      } else {
        setError(data.message || "Failed to update availability");
      }
    } catch {
      setError("Network error — could not update availability");
    } finally {
      setTogglingId(null);
    }
  };

  const startEdit = (vehicle: Vehicle) => {
    if (showAddForm) {
      cancelAddForm();
    }
    setEditingId(vehicle.id);
    setEditForm({ ...vehicle });
    // Scroll to edit form after React re-renders it
    setTimeout(() => {
      editFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const saveEdit = async () => {
    if (!editingId || !editForm) return;
    if (!editForm.make?.trim() || !editForm.model?.trim()) {
      setError("Make and Model are required");
      return;
    }
    if (!editForm.dailyRate || editForm.dailyRate <= 0 || !Number.isFinite(editForm.dailyRate)) {
      setError("Daily rate must be a positive number");
      return;
    }
    const currentYear = new Date().getFullYear();
    if (!editForm.year || editForm.year < 1990 || editForm.year > currentYear + 1) {
      setError(`Year must be between 1990 and ${currentYear + 1}`);
      return;
    }
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/vehicles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          year: editForm.year,
          make: editForm.make.trim(),
          model: editForm.model.trim(),
          category: editForm.category,
          images: editForm.images,
          specs: editForm.specs,
          dailyRate: editForm.dailyRate,
          features: editForm.features,
          isAvailable: editForm.isAvailable,
          isPublished: editForm.isPublished,
          description: editForm.description,
          color: editForm.color,
          mileage: editForm.mileage,
          licensePlate: editForm.licensePlate,
          vin: editForm.vin,
          maintenanceStatus: editForm.maintenanceStatus,
          purchasePrice: editForm.purchasePrice,
          isFinanced: editForm.isFinanced,
          monthlyPayment: editForm.monthlyPayment,
          paymentDayOfMonth: editForm.paymentDayOfMonth,
          financingStartDate: editForm.financingStartDate || null,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setVehicles((prev) =>
          prev.map((v) => {
            if (v.id !== editingId) return v;
            // Destructure out form-only UI fields before spreading into vehicle state
            const { featureInput: _, ...vehicleFields } = editForm;
            return { ...v, ...vehicleFields };
          })
        );
        setEditingId(null);
        setSuccess("Vehicle updated successfully!");
      } else {
        setError(data.message || "Failed to save changes");
      }
    } catch {
      setError("Network error — could not save changes");
    } finally {
      setSaving(false);
    }
  };

  const addVehicle = async () => {
    if (!newVehicle.make?.trim() || !newVehicle.model?.trim()) {
      setError("Make and Model are required");
      return;
    }
    const currentYear = new Date().getFullYear();
    if (!newVehicle.year || newVehicle.year < 1990 || newVehicle.year > currentYear + 1) {
      setError(`Year must be between 1990 and ${currentYear + 1}`);
      return;
    }
    if (newVehicle.mileage !== undefined && newVehicle.mileage !== null && newVehicle.mileage < 0) {
      setError("Mileage cannot be negative");
      return;
    }
    if (!newVehicle.dailyRate || newVehicle.dailyRate <= 0 || !Number.isFinite(newVehicle.dailyRate)) {
      setError("Daily rate must be a positive number");
      return;
    }
    if (newVehicle.make.trim().length > 50) {
      setError("Make must be 50 characters or less");
      return;
    }
    if (newVehicle.model.trim().length > 100) {
      setError("Model must be 100 characters or less");
      return;
    }
    if (newVehicle.description && newVehicle.description.length > 500) {
      setError("Description must be 500 characters or less");
      return;
    }
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: newVehicle.year,
          make: newVehicle.make.trim(),
          model: newVehicle.model.trim(),
          category: newVehicle.category,
          images: newVehicle.images || [],
          specs: newVehicle.specs,
          dailyRate: newVehicle.dailyRate,
          features: newVehicle.features || [],
          isAvailable: newVehicle.isAvailable,
          isPublished: newVehicle.isPublished,
          description: newVehicle.description,
          color: newVehicle.color,
          mileage: newVehicle.mileage,
          licensePlate: newVehicle.licensePlate,
          vin: newVehicle.vin,
          maintenanceStatus: newVehicle.maintenanceStatus,
          purchasePrice: newVehicle.purchasePrice,
          isFinanced: newVehicle.isFinanced,
          monthlyPayment: newVehicle.monthlyPayment,
          paymentDayOfMonth: newVehicle.paymentDayOfMonth,
          financingStartDate: newVehicle.financingStartDate || null,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        await fetchVehicles();
        setShowAddForm(false);
        setNewVehicle(emptyVehicle);
        setSuccess("Vehicle added successfully!");
      } else {
        setError(data.message || "Failed to add vehicle");
      }
    } catch {
      setError("Network error — could not add vehicle");
    } finally {
      setSaving(false);
    }
  };

  const deleteVehicle = async (id: string) => {
    const vehicle = vehicles.find((v) => v.id === id);
    const name = vehicle ? getVehicleDisplayName(vehicle) : "this vehicle";
    if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await adminFetch(`/api/admin/vehicles?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
      if (data.success) {
        setVehicles((prev) => prev.filter((v) => v.id !== id));
        // Close edit form if we just deleted the vehicle being edited
        if (editingId === id) setEditingId(null);
        setSuccess("Vehicle deleted successfully");
      } else {
        setError(data.message || "Failed to delete vehicle");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(message || "Network error — could not delete vehicle");
    } finally {
      setDeletingId(null);
    }
  };

  const addFeature = (formKey: "new" | string, featureInput: string) => {
    const trimmed = featureInput.trim();
    if (!trimmed) return;

    if (formKey === "new") {
      setNewVehicle((prev) => {
        const existing = (prev.features || []).map((f) => f.toLowerCase());
        if (existing.includes(trimmed.toLowerCase())) return { ...prev, featureInput: "" };
        return {
          ...prev,
          features: [...(prev.features || []), trimmed],
          featureInput: "",
        };
      });
    } else {
      setEditForm((prev) => {
        const existing = (prev.features || []).map((f) => f.toLowerCase());
        if (existing.includes(trimmed.toLowerCase())) return { ...prev, featureInput: "" };
        return {
          ...prev,
          features: [...(prev.features || []), trimmed],
          featureInput: "",
        };
      });
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
    <Card className="mb-4 border-purple-200">
      <CardContent className="p-4">
        <h3 className="font-semibold text-gray-900 mb-3">
          {formKey === "new"
            ? "Add New Vehicle"
            : `Edit: ${form.year} ${form.make} ${form.model}`.trim()}
        </h3>

        <div className="space-y-3">
          {/* Year Make Model Category Row */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                Year
              </label>
              <Input
                type="number"
                value={form.year ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm({ ...form, year: val === "" ? CURRENT_YEAR : Number(val) });
                }}
                min="1990"
                max={MAX_VEHICLE_YEAR}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                Make <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.make || ""}
                onChange={(e) => setForm({ ...form, make: e.target.value })}
                placeholder="e.g. Toyota"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                Model <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.model || ""}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="e.g. Camry"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                Category
              </label>
              <Select
                value={form.category || "sedan"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category: e.target.value as VehicleCategory,
                  })
                }
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Pricing Row */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                Daily Rate ($)
              </label>
              <Input
                type="number"
                value={form.dailyRate || 0}
                onChange={(e) => {
                  const val = e.target.value;
                  const num = val === "" ? 0 : parseFloat(val);
                  setForm({ ...form, dailyRate: isNaN(num) ? 0 : num });
                }}
                min="0"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                Purchase Price ($)
              </label>
              <Input
                type="number"
                value={form.purchasePrice || 0}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm({ ...form, purchasePrice: val === "" ? 0 : Number(val) });
                }}
                min="0"
                step="100"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                Available
              </label>
              <Select
                value={form.isAvailable ? "yes" : "no"}
                onChange={(e) =>
                  setForm({ ...form, isAvailable: e.target.value === "yes" })
                }
              >
                <option value="yes">Available</option>
                <option value="no">Unavailable</option>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                Published
              </label>
              <Select
                value={form.isPublished !== false ? "yes" : "no"}
                onChange={(e) =>
                  setForm({ ...form, isPublished: e.target.value === "yes" })
                }
              >
                <option value="yes">Visible</option>
                <option value="no">Hidden</option>
              </Select>
            </div>
          </div>

          {/* Financing Section */}
          <div className="border border-purple-200 rounded-lg p-2.5 bg-purple-50/50">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                Vehicle Financing
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={form.isFinanced}
                aria-label="Toggle vehicle financing"
                onClick={() => setForm({ ...form, isFinanced: !form.isFinanced })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  form.isFinanced ? "bg-purple-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    form.isFinanced ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            {!form.isFinanced && (
              <p className="text-xs text-gray-400">Enable to track monthly payments and financing details.</p>
            )}
            {form.isFinanced && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                    Monthly Payment ($)
                  </label>
                  <Input
                    type="number"
                    value={form.monthlyPayment || 0}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm({ ...form, monthlyPayment: val === "" ? 0 : Number(val) });
                    }}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                    Payment Day (1-31)
                  </label>
                  <Input
                    type="number"
                    value={form.paymentDayOfMonth ?? 1}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        paymentDayOfMonth: Math.min(31, Math.max(1, Number(e.target.value))),
                      })
                    }
                    min="1"
                    max="31"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                    Financing Start
                  </label>
                  <DatePicker
                    value={form.financingStartDate || ""}
                    onChange={(val) =>
                      setForm({ ...form, financingStartDate: val })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Color, License, VIN, Mileage, Maintenance Row */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                Color
              </label>
              <Input
                value={form.color || ""}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="e.g. White"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
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
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                VIN
              </label>
              <Input
                value={form.vin || ""}
                onChange={(e) => setForm({ ...form, vin: e.target.value })}
                placeholder="Vehicle ID Number"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                Mileage
              </label>
              <Input
                type="number"
                value={form.mileage || 0}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm({ ...form, mileage: val === "" ? 0 : Number(val) });
                }}
                min="0"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                Maintenance
              </label>
              <Select
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
              >
                <option value="good">Good</option>
                <option value="needs-service">Needs Service</option>
                <option value="in-maintenance">In Maintenance</option>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
              Description
            </label>
            <Textarea
              value={form.description || ""}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Brief description of the vehicle"
              rows={2}
            />
          </div>

          <VehicleImageManager
            vehicleId={formKey}
            images={form.images || []}
            onImagesChange={(images) => setForm({ ...form, images })}
            onSaved={
              formKey !== "new"
                ? (images) => syncVehicleImagesInList(formKey, images)
                : undefined
            }
            onError={setError}
            disabled={isSaving}
          />

          {/* Features Section */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">
              Features
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(form.features || []).map((feature, idx) => (
                <Badge
                  key={`${feature}-${idx}`}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {feature}
                  <button
                    type="button"
                    onClick={() => removeFeature(idx, formKey)}
                    aria-label={`Remove ${feature}`}
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
                placeholder="Add a feature (e.g. Leather seats)"
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
                disabled={!form.featureInput?.trim()}
                aria-label="Add feature"
                onClick={() =>
                  addFeature(formKey, form.featureInput || "")
                }
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
          </div>

          {/* Specs Grid */}
          <div className="border-t pt-3">
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 text-gray-500" />
              Vehicle Specifications
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                  Passengers
                </label>
                <Input
                  type="number"
                  value={form.specs?.passengers ?? 5}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm({
                      ...form,
                      specs: {
                        ...(form.specs || emptyVehicle.specs),
                        passengers: val === "" ? 1 : Number(val),
                      },
                    });
                  }}
                  min="1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                  Luggage
                </label>
                <Input
                  type="number"
                  value={form.specs?.luggage ?? 2}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm({
                      ...form,
                      specs: {
                        ...(form.specs || emptyVehicle.specs),
                        luggage: val === "" ? 0 : Number(val),
                      },
                    });
                  }}
                  min="0"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                  Doors
                </label>
                <Input
                  type="number"
                  value={form.specs?.doors ?? 4}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm({
                      ...form,
                      specs: {
                        ...(form.specs || emptyVehicle.specs),
                        doors: val === "" ? 4 : Number(val),
                      },
                    });
                  }}
                  min="2"
                  max="5"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                  Transmission
                </label>
                <Select
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
                >
                  {TRANSMISSION_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                  Fuel Type
                </label>
                <Select
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
                >
                  {FUEL_TYPE_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                  MPG
                </label>
                <Input
                  type="number"
                  value={form.specs?.mpg ?? 30}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm({
                      ...form,
                      specs: {
                        ...(form.specs || emptyVehicle.specs),
                        mpg: val === "" ? 0 : Number(val),
                      },
                    });
                  }}
                  min="5"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t">
            <Button
              onClick={onSave}
              disabled={isSaving || !form.make?.trim() || !form.model?.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSaving ? <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Saving...</> : <><Check className="h-4 w-4 mr-1" /> Save</>}
            </Button>
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      {/* Header Section */}
      <AdminPageHeader
        title="Fleet Management"
        subtitle={`Manage your rental vehicle fleet${vehicles.length > 0 ? ` · ${vehicles.length} vehicle${vehicles.length !== 1 ? "s" : ""}` : ""}`}
        actions={
          <Button
            onClick={() => {
              if (showAddForm) {
                setNewVehicle(emptyVehicle);
              }
              setShowAddForm(!showAddForm);
              setEditingId(null);
            }}
            className="bg-white text-purple-900 hover:bg-gray-100"
          >
            {showAddForm ? (
              <><X className="h-4 w-4 mr-2" /> Cancel</>
            ) : (
              <><Plus className="h-4 w-4 mr-2" /> Add Vehicle</>
            )}
          </Button>
        }
      />

      <AdminPageBody>
        {/* Success Banner */}
        {success ? (
          <AdminStatusBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
        ) : null}

        {/* Error Banner */}
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => fetchVehicles()} className="ml-2 text-red-600 underline text-xs hover:text-red-700">Retry</button>
              <button
                onClick={() => setError(null)}
                aria-label="Dismiss error"
                className="text-red-400 hover:text-red-600 ml-3"
              >
                &times;
              </button>
            </div>
          </div>
        ) : null}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-gray-100 p-2">
                <Car className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </div>
                <p className="text-sm text-gray-600">Total Vehicles</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.available}
                </div>
                <p className="text-sm text-gray-600">Available</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-yellow-100 p-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.inMaintenance}
                </div>
                <p className="text-sm text-gray-600">In Maintenance</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  ${stats.avgRate}
                </div>
                <p className="text-sm text-gray-600">Avg Daily Rate</p>
              </div>
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
              cancelAddForm,
              saving
            )}
          </>
        )}

        <VehicleFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterCategory={filterCategory}
          onCategoryChange={setFilterCategory}
          onRefresh={() => fetchVehicles()}
          loading={loading}
          totalCount={vehicles.length}
          filteredCount={filteredVehicles.length}
        />

        {/* Edit Form */}
        {editingId && (
          <div ref={editFormRef}>
            {renderVehicleForm(
              editForm,
              setEditForm,
              editingId,
              saveEdit,
              () => setEditingId(null),
              saving
            )}
          </div>
        )}

        <VehicleList
          vehicles={vehicles}
          filteredVehicles={filteredVehicles}
          loading={loading}
          pathname={pathname}
          editingId={editingId}
          togglingId={togglingId}
          deletingId={deletingId}
          saving={saving}
          searchQuery={searchQuery}
          filterCategory={filterCategory}
          onClearFilters={() => {
            setSearchQuery("");
            setFilterCategory("");
          }}
          onShowAddForm={() => {
            setShowAddForm(true);
            setEditingId(null);
          }}
          onStartEdit={startEdit}
          onCancelEdit={() => setEditingId(null)}
          onToggleAvailability={toggleAvailability}
          onDelete={deleteVehicle}
        />
      </AdminPageBody>
    </>
  );
}
