"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { Location } from "@/lib/types";
import { logger } from "@/lib/utils/logger";
import { AddressAutocomplete } from "@/components/address-autocomplete";

interface FormState extends Omit<Location, "id" | "created_at"> {
  id?: string;
}

const emptyLocation: Omit<FormState, "id"> = {
  name: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  surcharge: 0,
  is_default: false,
  is_active: true,
  notes: "",
};

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>({ ...emptyLocation });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLocation, setNewLocation] = useState<Omit<FormState, "id">>(
    emptyLocation
  );
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-dismiss toasts
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchLocations = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/locations", { signal });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const errData = await res.json();
          if (errData.message) msg = errData.message;
        } catch {
          // Response wasn't JSON
        }
        throw new Error(msg);
      }
      const data = await res.json();
      if (data.success) {
        setLocations(data.data);
      } else {
        setError(data.message || "Failed to load locations");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      logger.error("Failed to fetch locations:", err);
      setError(
        err instanceof Error && err.message !== "Failed to fetch"
          ? `Failed to load locations: ${err.message}`
          : "Network error — could not load locations"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchLocations(controller.signal);
    return () => controller.abort();
  }, []);

  // Close forms on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || saving) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        (e.target as HTMLElement).blur();
        return;
      }
      if (editingId) {
        setEditingId(null);
      } else if (showAddForm) {
        setShowAddForm(false);
        setNewLocation(emptyLocation);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editingId, showAddForm, saving]);

  // Compute stats
  const stats = useMemo(
    () => ({
      total: locations.length,
      active: locations.filter((l) => l.is_active).length,
      default: locations.find((l) => l.is_default)?.name || "None",
    }),
    [locations]
  );

  const toggleActive = async (location: Location) => {
    setTogglingId(location.id);
    try {
      const res = await adminFetch("/api/admin/locations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: location.id,
          is_active: !location.is_active,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setLocations((prev) =>
          prev.map((l) =>
            l.id === location.id ? { ...l, is_active: !l.is_active } : l
          )
        );
        setSuccess(
          `${location.name} marked as ${!location.is_active ? "active" : "inactive"}`
        );
      } else {
        setError(data.message || "Failed to update status");
      }
    } catch {
      setError("Network error — could not update status");
    } finally {
      setTogglingId(null);
    }
  };

  const startEdit = (location: Location) => {
    if (showAddForm) {
      setShowAddForm(false);
      setNewLocation(emptyLocation);
    }
    setEditingId(location.id);
    setEditForm({
      name: location.name,
      address: location.address,
      city: location.city,
      state: location.state,
      zip: location.zip,
      surcharge: location.surcharge,
      is_default: location.is_default,
      is_active: location.is_active,
      notes: location.notes || "",
      lat: (location as any).lat || null,
      lng: (location as any).lng || null,
    });
  };

  const saveEdit = async () => {
    if (!editingId || !editForm) return;
    if (!editForm.name?.trim()) {
      setError("Location name is required");
      return;
    }
    if (!editForm.address?.trim()) {
      setError("Address is required");
      return;
    }
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/locations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          name: editForm.name.trim(),
          address: editForm.address.trim(),
          city: editForm.city.trim(),
          state: editForm.state.trim().toUpperCase(),
          zip: editForm.zip.trim(),
          surcharge: Number(editForm.surcharge) || 0,
          is_default: editForm.is_default,
          is_active: editForm.is_active,
          notes: editForm.notes?.trim() || null,
          lat: (editForm as any).lat,
          lng: (editForm as any).lng,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setLocations((prev) =>
          prev.map((l) => (l.id === editingId ? { ...data.data } : l))
        );
        setEditingId(null);
        setSuccess("Location updated successfully!");
      } else {
        setError(data.message || "Failed to save changes");
      }
    } catch {
      setError("Network error — could not save changes");
    } finally {
      setSaving(false);
    }
  };

  const addLocation = async () => {
    if (!newLocation.name?.trim()) {
      setError("Location name is required");
      return;
    }
    if (!newLocation.address?.trim()) {
      setError("Address is required");
      return;
    }
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newLocation.name.trim(),
          address: newLocation.address.trim(),
          city: newLocation.city.trim(),
          state: newLocation.state.trim().toUpperCase(),
          zip: newLocation.zip.trim(),
          surcharge: Number(newLocation.surcharge) || 0,
          is_default: newLocation.is_default,
          is_active: newLocation.is_active,
          notes: newLocation.notes?.trim() || null,
          lat: (newLocation as any).lat,
          lng: (newLocation as any).lng,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        await fetchLocations();
        setShowAddForm(false);
        setNewLocation(emptyLocation);
        setSuccess("Location added successfully!");
      } else {
        setError(data.message || "Failed to add location");
      }
    } catch {
      setError("Network error — could not add location");
    } finally {
      setSaving(false);
    }
  };

  const deleteLocation = async (id: string) => {
    const location = locations.find((l) => l.id === id);
    const name = location?.name || "this location";
    if (
      !confirm(
        `Are you sure you want to delete ${name}? This action cannot be undone.`
      )
    )
      return;
    setDeletingId(id);
    try {
      const res = await adminFetch(`/api/admin/locations?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setLocations((prev) => prev.filter((l) => l.id !== id));
        if (editingId === id) setEditingId(null);
        setSuccess("Location deleted successfully");
      } else {
        setError(data.message || "Failed to delete location");
      }
    } catch {
      setError("Network error — could not delete location");
    } finally {
      setDeletingId(null);
    }
  };

  const setAsDefault = async (location: Location) => {
    setTogglingId(location.id);
    try {
      const res = await adminFetch("/api/admin/locations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: location.id,
          is_default: true,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        // Update all locations: only the one being set should be default
        setLocations((prev) =>
          prev.map((l) => ({
            ...l,
            is_default: l.id === location.id,
          }))
        );
        setSuccess(`${location.name} set as default location`);
      } else {
        setError(data.message || "Failed to set default location");
      }
    } catch {
      setError("Network error — could not set default location");
    } finally {
      setTogglingId(null);
    }
  };

  const handleGeocode = async (
    form: Omit<FormState, "id"> | FormState,
    setForm: (form: any) => void
  ) => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!key) {
      setError("Google Maps API key not configured");
      return;
    }
    const addr = [form.address, form.city, form.state, form.zip]
      .filter(Boolean)
      .join(", ");
    if (!addr) {
      setError("Enter an address first");
      return;
    }
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addr)}&key=${key}`
      );
      const data = await res.json();
      if (data.results?.[0]?.geometry?.location) {
        const { lat, lng } = data.results[0].geometry.location;
        setForm({ ...form, lat, lng });
        setSuccess("Coordinates auto-detected!");
      } else {
        setError("Could not find coordinates for this address");
      }
    } catch {
      setError("Geocoding failed");
    }
  };

  const renderLocationForm = (
    form: Omit<FormState, "id"> | FormState,
    setForm: (form: any) => void,
    isNew: boolean,
    onSave: () => void,
    onCancel: () => void,
    isSaving: boolean
  ) => (
    <Card className="mb-4 border-purple-200">
      <CardContent className="p-4">
        <h3 className="font-semibold text-gray-900 mb-3">
          {isNew ? "Add New Location" : `Edit: ${form.name}`}
        </h3>

        <div className="space-y-3">
          {/* Name & Address Row */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-0.5 block">
                Location Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Downtown Office"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-0.5 block">
                Address <span className="text-red-500">*</span>
              </label>
              <AddressAutocomplete
                value={form.address || ""}
                onChange={(val) => setForm({ ...form, address: val })}
                onSelect={(result) => {
                  setForm({
                    ...form,
                    address: result.address,
                    city: result.city || form.city,
                    state: result.state || form.state,
                    zip: result.zip || form.zip,
                    lat: result.lat || (form as any).lat,
                    lng: result.lng || (form as any).lng,
                    name: form.name || result.name || "",
                  });
                  setSuccess("Address auto-filled!");
                }}
                placeholder="Start typing an address..."
              />
            </div>
          </div>

          {/* City, State, ZIP Row */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-0.5 block">
                City
              </label>
              <Input
                value={form.city || ""}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="e.g. New York"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-0.5 block">
                State
              </label>
              <Input
                value={form.state || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    state: e.target.value.slice(0, 2).toUpperCase(),
                  })
                }
                placeholder="e.g. NY"
                maxLength={2}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-0.5 block">
                ZIP
              </label>
              <Input
                value={form.zip || ""}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
                placeholder="e.g. 10001"
              />
            </div>
          </div>

          {/* Surcharge Row */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-0.5 block">
                Surcharge ($)
              </label>
              <Input
                type="number"
                value={form.surcharge ?? 0}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm({
                    ...form,
                    surcharge: val === "" ? 0 : Number(val),
                  });
                }}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-0.5 block">
                Status
              </label>
              <select
                value={form.is_active ? "active" : "inactive"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    is_active: e.target.value === "active",
                  })
                }
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Coordinates Section */}
          <div className="border border-gray-200 rounded-lg p-3">
            <label className="text-xs font-medium text-gray-700 block mb-2">
              Coordinates
            </label>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Latitude
                </label>
                <Input
                  type="number"
                  step="any"
                  value={(form as any).lat || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      lat: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="40.7128"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Longitude
                </label>
                <Input
                  type="number"
                  step="any"
                  value={(form as any).lng || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      lng: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="-74.0060"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleGeocode(form, setForm)}
              className="text-xs text-purple-600 hover:text-purple-800"
            >
              Auto-detect from address
            </button>
          </div>

          {/* Default Location Checkbox */}
          <div className="flex items-center gap-2 border border-purple-200 rounded-lg p-2.5 bg-purple-50/50">
            <input
              type="checkbox"
              id={`default-${isNew ? "new" : "edit"}`}
              checked={form.is_default || false}
              onChange={(e) =>
                setForm({ ...form, is_default: e.target.checked })
              }
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <label
              htmlFor={`default-${isNew ? "new" : "edit"}`}
              className="text-sm font-medium text-gray-700"
            >
              Set as default pickup/dropoff location
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-0.5 block">
              Notes
            </label>
            <textarea
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. Business hours: 9AM-6PM, Near parking lot"
              rows={2}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={onSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button
              onClick={onCancel}
              disabled={isSaving}
              variant="outline"
              className="text-gray-700"
            >
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <PageContainer>
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm shadow-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm shadow-lg">
            {success}
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="h-8 w-8 text-purple-600" />
            Locations
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage pickup and dropoff locations
          </p>
        </div>
        <Button
          onClick={() => {
            if (editingId) setEditingId(null);
            setShowAddForm(!showAddForm);
            if (showAddForm) setNewLocation(emptyLocation);
          }}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Plus className="h-4 w-4" />
          Add Location
        </Button>
      </div>

      {/* Stats Cards */}
      {!loading && (
        <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Total Locations
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats.total}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Active
              </p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {stats.active}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Default Location
              </p>
              <p className="text-lg font-bold text-gray-900 mt-1 truncate">
                {stats.default}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <>
          {renderLocationForm(
            newLocation,
            setNewLocation,
            true,
            addLocation,
            () => {
              setShowAddForm(false);
              setNewLocation(emptyLocation);
            },
            saving
          )}
        </>
      )}

      {/* Edit Form */}
      {editingId && (
        <>
          {renderLocationForm(
            editForm,
            setEditForm,
            false,
            saveEdit,
            () => setEditingId(null),
            saving
          )}
        </>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
        </div>
      ) : locations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              No locations yet. Click "Add Location" to create one.
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Table */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Address
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Surcharge
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Default
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((location) => (
                    <tr
                      key={location.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {(location as any).lat && (location as any).lng && (
                            <span title="Has coordinates">📍</span>
                          )}
                          {location.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <div className="max-w-xs">
                          <p className="text-sm">{location.address}</p>
                          <p className="text-xs text-gray-500">
                            {location.city}
                            {location.city && location.state ? ", " : ""}
                            {location.state} {location.zip}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {location.surcharge > 0
                          ? `$${location.surcharge.toFixed(2)}`
                          : "Free"}
                      </td>
                      <td className="px-4 py-3">
                        {location.is_default ? (
                          <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1 w-fit">
                            <Star className="h-3 w-3" />
                            Default
                          </Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            location.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }
                        >
                          {location.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!location.is_default && (
                            <button
                              onClick={() => setAsDefault(location)}
                              disabled={togglingId === location.id}
                              title="Set as default"
                              className="p-1.5 hover:bg-purple-50 rounded-lg text-gray-600 hover:text-purple-600 transition-colors disabled:opacity-50"
                            >
                              {togglingId === location.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Star className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => toggleActive(location)}
                            disabled={togglingId === location.id}
                            title={
                              location.is_active
                                ? "Deactivate"
                                : "Activate"
                            }
                            className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50"
                          >
                            {togglingId === location.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : location.is_active ? (
                              <ToggleRight className="h-4 w-4" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => startEdit(location)}
                            disabled={saving}
                            title="Edit"
                            className="p-1.5 hover:bg-amber-50 rounded-lg text-gray-600 hover:text-amber-600 transition-colors disabled:opacity-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteLocation(location.id)}
                            disabled={deletingId === location.id}
                            title="Delete"
                            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50"
                          >
                            {deletingId === location.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
