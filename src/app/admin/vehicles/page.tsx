"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Car,
  Users,
  Fuel,
  Settings2,
  X,
  Save,
  Calendar,
} from "lucide-react";
import type { Vehicle, VehicleCategory } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/date-helpers";

const vehicleStatusColors = {
  available: "bg-green-100 text-green-800",
  rented: "bg-blue-100 text-blue-800",
  maintenance: "bg-orange-100 text-orange-800",
};

export default function VehicleManagement() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    async function fetchVehicles() {
      try {
        const res = await fetch("/api/vehicles");
        const data = await res.json();
        setVehicles(data.data || []);
      } catch (error) {
        console.error("Failed to fetch vehicles:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchVehicles();
  }, []);

  const filteredVehicles = vehicles.filter(
    (v) =>
      !searchQuery ||
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getVehicleStatus = (v: Vehicle) =>
    v.isAvailable ? "available" : "rented";

  const toggleAvailability = (vehicleId: string) => {
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === vehicleId ? { ...v, isAvailable: !v.isAvailable } : v
      )
    );
  };

  const handleSaveEdit = (updatedVehicle: Vehicle) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === updatedVehicle.id ? updatedVehicle : v))
    );
    setEditingVehicle(null);
  };

  const handleDelete = (vehicleId: string) => {
    if (confirm("Are you sure you want to remove this vehicle from the fleet?")) {
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-32 bg-gray-200 rounded-lg" />
                <div className="h-5 w-32 bg-gray-200 rounded" />
                <div className="h-4 w-24 bg-gray-200 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search vehicles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Vehicle
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {vehicles.filter((v) => v.isAvailable).length}
              </p>
              <p className="text-xs text-gray-500">Available</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {vehicles.filter((v) => !v.isAvailable).length}
              </p>
              <p className="text-xs text-gray-500">Rented</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {vehicles.length}
              </p>
              <p className="text-xs text-gray-500">Total Fleet</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVehicles.map((vehicle) => {
          const status = getVehicleStatus(vehicle);
          return (
            <Card key={vehicle.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
                <Car className="w-16 h-16 text-gray-400" />
                <div className="absolute top-3 right-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${vehicleStatusColors[status]}`}
                  >
                    {status}
                  </span>
                </div>
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {vehicle.name}
                    </h3>
                    <p className="text-sm text-gray-500 capitalize">
                      {vehicle.category}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(vehicle.dailyRate)}
                    <span className="text-xs text-gray-400 font-normal">
                      /day
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {vehicle.specs.passengers} seats
                  </span>
                  <span className="flex items-center gap-1">
                    <Settings2 className="w-3.5 h-3.5" />
                    {vehicle.specs.transmission}
                  </span>
                  <span className="flex items-center gap-1">
                    <Fuel className="w-3.5 h-3.5" />
                    {vehicle.specs.fuelType}
                  </span>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Weekly:</span>
                    <span className="font-medium">
                      {formatCurrency(vehicle.weeklyRate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly:</span>
                    <span className="font-medium">
                      {formatCurrency(vehicle.monthlyRate)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => setEditingVehicle(vehicle)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => toggleAvailability(vehicle.id)}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                      vehicle.isAvailable
                        ? "bg-orange-50 text-orange-700 hover:bg-orange-100"
                        : "bg-green-50 text-green-700 hover:bg-green-100"
                    }`}
                  >
                    {vehicle.isAvailable ? "Set Unavailable" : "Set Available"}
                  </button>
                  <button
                    onClick={() => handleDelete(vehicle.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove vehicle"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Vehicle Panel */}
      {editingVehicle && (
        <VehicleEditPanel
          vehicle={editingVehicle}
          onSave={handleSaveEdit}
          onClose={() => setEditingVehicle(null)}
        />
      )}
    </div>
  );
}

function VehicleEditPanel({
  vehicle,
  onSave,
  onClose,
}: {
  vehicle: Vehicle;
  onSave: (v: Vehicle) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: vehicle.name,
    category: vehicle.category,
    description: vehicle.description,
    dailyRate: vehicle.dailyRate,
    weeklyRate: vehicle.weeklyRate,
    monthlyRate: vehicle.monthlyRate,
    passengers: vehicle.specs.passengers,
    luggage: vehicle.specs.luggage,
    transmission: vehicle.specs.transmission,
    fuelType: vehicle.specs.fuelType,
    mpg: vehicle.specs.mpg,
    doors: vehicle.specs.doors,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...vehicle,
      name: form.name,
      category: form.category as VehicleCategory,
      description: form.description,
      dailyRate: form.dailyRate,
      weeklyRate: form.weeklyRate,
      monthlyRate: form.monthlyRate,
      specs: {
        passengers: form.passengers,
        luggage: form.luggage,
        transmission: form.transmission as "Automatic" | "Manual",
        fuelType: form.fuelType as "Gasoline" | "Diesel" | "Hybrid" | "Electric",
        mpg: form.mpg,
        doors: form.doors,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit {vehicle.name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as VehicleCategory })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="compact">Compact</option>
                <option value="sedan">Sedan</option>
                <option value="suv">SUV</option>
                <option value="truck">Truck</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transmission
              </label>
              <select
                value={form.transmission}
                onChange={(e) => setForm({ ...form, transmission: e.target.value as "Automatic" | "Manual" })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="Automatic">Automatic</option>
                <option value="Manual">Manual</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Daily Rate
              </label>
              <input
                type="number"
                value={form.dailyRate}
                onChange={(e) => setForm({ ...form, dailyRate: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weekly Rate
              </label>
              <input
                type="number"
                value={form.weeklyRate}
                onChange={(e) => setForm({ ...form, weeklyRate: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Rate
              </label>
              <input
                type="number"
                value={form.monthlyRate}
                onChange={(e) => setForm({ ...form, monthlyRate: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Passengers
              </label>
              <input
                type="number"
                value={form.passengers}
                onChange={(e) => setForm({ ...form, passengers: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fuel Type
              </label>
              <select
                value={form.fuelType}
                onChange={(e) => setForm({ ...form, fuelType: e.target.value as "Gasoline" | "Diesel" | "Hybrid" | "Electric" })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="Gasoline">Gasoline</option>
                <option value="Diesel">Diesel</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Electric">Electric</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
