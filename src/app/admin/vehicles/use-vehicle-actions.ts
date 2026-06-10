"use client";

import { useRef, useState } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { cleanupTempVehicleImages } from "@/components/admin/vehicle-image-manager";
import { Vehicle, getVehicleDisplayName } from "@/lib/types";
import { emptyVehicle, type VehicleFormState } from "./vehicle-form";

interface UseVehicleActionsOptions {
  vehicles: Vehicle[];
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  invalidateVehicles: () => Promise<void>;
  setError: (message: string | null) => void;
  setSuccess: (message: string | null) => void;
}

export function useVehicleActions({
  vehicles,
  setVehicles,
  invalidateVehicles,
  setError,
  setSuccess,
}: UseVehicleActionsOptions) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<VehicleFormState>({ ...emptyVehicle });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVehicle, setNewVehicle] = useState<VehicleFormState>(emptyVehicle);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const editFormRef = useRef<HTMLDivElement>(null);

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
        await invalidateVehicles();
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

  return {
    editingId,
    setEditingId,
    editForm,
    setEditForm,
    showAddForm,
    setShowAddForm,
    newVehicle,
    setNewVehicle,
    saving,
    deletingId,
    togglingId,
    editFormRef,
    cancelAddForm,
    syncVehicleImagesInList,
    toggleAvailability,
    startEdit,
    saveEdit,
    addVehicle,
    deleteVehicle,
    addFeature,
    removeFeature,
  };
}
