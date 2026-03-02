"use client";

import React, { useEffect, useState } from "react";
import { Car, Plus, Pencil, Trash2, Check, X, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";

interface Vehicle {
  id: string;
  name: string;
  category: string;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  isAvailable: boolean;
  description: string;
  features: string[];
  specs: { passengers: number; luggage: number; transmission: string; fuelType: string; mpg: number; doors: number };
}

const CATEGORIES = ["compact", "sedan", "suv", "truck", "luxury", "van"];

const emptyVehicle: Omit<Vehicle, "id"> = {
  name: "",
  category: "sedan",
  dailyRate: 50,
  weeklyRate: 300,
  monthlyRate: 1050,
  isAvailable: true,
  description: "",
  features: [],
  specs: { passengers: 5, luggage: 2, transmission: "Automatic", fuelType: "Gasoline", mpg: 30, doors: 4 },
};

export default function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Vehicle>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVehicle, setNewVehicle] = useState(emptyVehicle);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState("");

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/vehicles");
      const data = await res.json();
      if (data.success) {
        setVehicles(data.data);
        setSource(data.source);
      }
    } catch (err) {
      console.error("Failed to fetch vehicles:", err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchVehicles(); }, []);

  const toggleAvailability = async (vehicle: Vehicle) => {
    const res = await fetch("/api/admin/vehicles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: vehicle.id, isAvailable: !vehicle.isAvailable }),
    });
    const data = await res.json();
    if (data.success) {
      setVehicles((prev) => prev.map((v) => v.id === vehicle.id ? { ...v, isAvailable: !v.isAvailable } : v));
    }
  };

  const startEdit = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setEditForm({ ...vehicle });
  };

  const saveEdit = async () => {
    if (!editingId || !editForm) return;
    setSaving(true);
    const res = await fetch("/api/admin/vehicles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, ...editForm }),
    });
    const data = await res.json();
    if (data.success) {
      setVehicles((prev) => prev.map((v) => v.id === editingId ? { ...v, ...editForm } : v));
      setEditingId(null);
    }
    setSaving(false);
  };

  const addVehicle = async () => {
    if (!newVehicle.name) return;
    setSaving(true);
    const res = await fetch("/api/admin/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newVehicle),
    });
    const data = await res.json();
    if (data.success) {
      await fetchVehicles();
      setShowAddForm(false);
      setNewVehicle(emptyVehicle);
    }
    setSaving(false);
  };

  const deleteVehicle = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;
    const res = await fetch(`/api/admin/vehicles?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      setVehicles((prev) => prev.filter((v) => v.id !== id));
    }
  };

  return (
    <>
      <section className="bg-gradient-to-br from-gray-900 to-purple-900 py-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Vehicles</h1>
              <p className="mt-1 text-purple-200">Manage your fleet — {vehicles.length} vehicles{source === "json" ? " (from static data)" : ""}</p>
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-white text-purple-900 hover:bg-gray-100">
              <Plus className="h-4 w-4 mr-1" /> Add Vehicle
            </Button>
          </div>
        </div>
      </section>

      <PageContainer className="py-8">
        {/* Add Vehicle Form */}
        {showAddForm && (
          <Card className="mb-6 border-purple-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Add New Vehicle</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Name</label>
                  <Input value={newVehicle.name} onChange={(e) => setNewVehicle({ ...newVehicle, name: e.target.value })} placeholder="e.g. Toyota Camry" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
                  <select value={newVehicle.category} onChange={(e) => setNewVehicle({ ...newVehicle, category: e.target.value })} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Daily Rate ($)</label>
                  <Input type="number" value={newVehicle.dailyRate} onChange={(e) => setNewVehicle({ ...newVehicle, dailyRate: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Weekly Rate ($)</label>
                  <Input type="number" value={newVehicle.weeklyRate} onChange={(e) => setNewVehicle({ ...newVehicle, weeklyRate: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Monthly Rate ($)</label>
                  <Input type="number" value={newVehicle.monthlyRate} onChange={(e) => setNewVehicle({ ...newVehicle, monthlyRate: Number(e.target.value) })} />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
                  <Input value={newVehicle.description} onChange={(e) => setNewVehicle({ ...newVehicle, description: e.target.value })} placeholder="Brief description of the vehicle" />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={addVehicle} disabled={saving || !newVehicle.name}>
                  {saving ? "Adding..." : "Add Vehicle"}
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Refresh */}
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={fetchVehicles} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {/* Vehicles Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Vehicle</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Daily</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Weekly</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Monthly</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : vehicles.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No vehicles found.</td></tr>
                ) : (
                  vehicles.map((v) => (
                    <tr key={v.id} className="border-b last:border-0 hover:bg-gray-50">
                      {editingId === v.id ? (
                        <>
                          <td className="px-4 py-3">
                            <Input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="h-8 text-sm" />
                          </td>
                          <td className="px-4 py-3">
                            <select value={editForm.category || ""} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="rounded-md border border-gray-200 px-2 py-1 text-sm h-8">
                              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3"><Input type="number" value={editForm.dailyRate || 0} onChange={(e) => setEditForm({ ...editForm, dailyRate: Number(e.target.value) })} className="h-8 text-sm w-20" /></td>
                          <td className="px-4 py-3"><Input type="number" value={editForm.weeklyRate || 0} onChange={(e) => setEditForm({ ...editForm, weeklyRate: Number(e.target.value) })} className="h-8 text-sm w-20" /></td>
                          <td className="px-4 py-3"><Input type="number" value={editForm.monthlyRate || 0} onChange={(e) => setEditForm({ ...editForm, monthlyRate: Number(e.target.value) })} className="h-8 text-sm w-24" /></td>
                          <td className="px-4 py-3">—</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={saveEdit} disabled={saving}>
                                <Check className="h-3 w-3 mr-1" /> Save
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingId(null)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-gray-400" />
                              <span className="font-medium text-gray-900">{v.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3"><Badge variant="secondary">{v.category}</Badge></td>
                          <td className="px-4 py-3 font-medium">${v.dailyRate}</td>
                          <td className="px-4 py-3 text-gray-600">${v.weeklyRate}</td>
                          <td className="px-4 py-3 text-gray-600">${v.monthlyRate}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => toggleAvailability(v)} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${v.isAvailable ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200"}`}>
                              {v.isAvailable ? "Available" : "Unavailable"}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => startEdit(v)}>
                                <Pencil className="h-3 w-3 mr-1" /> Edit
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 hover:text-red-700" onClick={() => deleteVehicle(v.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </PageContainer>
    </>
  );
}
