"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAutoToast } from "@/lib/hooks/useAutoToast";
import {
  Car,
  Plus,
  X,
  DollarSign,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminPageHeader, AdminPageBody } from "@/components/admin/admin-shell";
import { AdminStatusBanner } from "@/components/admin/ui-feedback";
import { VehicleCategory, getVehicleDisplayName } from "@/lib/types";
import { VehicleFilters } from "./vehicle-filters";
import { VehicleList } from "./vehicle-list";
import { useVehiclesData } from "./use-vehicles-data";
import { useVehicleActions } from "./use-vehicle-actions";
import { VehicleForm, emptyVehicle } from "./vehicle-form";

export default function AdminVehiclesPage() {
  const pathname = usePathname();
  const { vehicles, setVehicles, loading, refetch, invalidateVehicles } = useVehiclesData();
  const { error, setError, success, setSuccess } = useAutoToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<VehicleCategory | "">("");

  const {
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
  } = useVehicleActions({
    vehicles,
    setVehicles,
    invalidateVehicles,
    setError,
    setSuccess,
  });

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
        cancelAddForm();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editingId, showAddForm, saving, newVehicle.images, cancelAddForm, setEditingId]);

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

  return (
    <>
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
        {success ? (
          <AdminStatusBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => void refetch()} className="ml-2 text-red-600 underline text-xs hover:text-red-700">Retry</button>
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

        {showAddForm && (
          <VehicleForm
            form={newVehicle}
            setForm={setNewVehicle}
            formKey="new"
            onSave={addVehicle}
            onCancel={cancelAddForm}
            isSaving={saving}
            onAddFeature={addFeature}
            onRemoveFeature={removeFeature}
            onError={setError}
          />
        )}

        <VehicleFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterCategory={filterCategory}
          onCategoryChange={setFilterCategory}
          onRefresh={() => void refetch()}
          loading={loading}
          totalCount={vehicles.length}
          filteredCount={filteredVehicles.length}
        />

        {editingId && (
          <div ref={editFormRef}>
            <VehicleForm
              form={editForm}
              setForm={setEditForm}
              formKey={editingId}
              onSave={saveEdit}
              onCancel={() => setEditingId(null)}
              isSaving={saving}
              onAddFeature={addFeature}
              onRemoveFeature={removeFeature}
              onSyncImages={syncVehicleImagesInList}
              onError={setError}
            />
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
