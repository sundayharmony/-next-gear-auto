"use client";

import React, { useState, useEffect, useMemo } from "react";
import { MapPin, Plus, Pencil, Trash2, Loader2, ToggleLeft, ToggleRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { Location } from "@/lib/types";
import { AddressAutocomplete } from "@/components/address-autocomplete";

/* ── Types ────────────────────────────────────── */

interface LocationForm {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lng: number | null;
  surcharge: number;
  is_default: boolean;
  is_active: boolean;
  notes: string;
}

const blank: LocationForm = { name: "", address: "", city: "", state: "", zip: "", lat: null, lng: null, surcharge: 0, is_default: false, is_active: true, notes: "" };

/* ── Page ─────────────────────────────────────── */

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Forms
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<LocationForm>({ ...blank });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<LocationForm>({ ...blank });

  // Inline action spinners
  const [busyId, setBusyId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); } }, [toast]);

  const ok = (msg: string) => setToast({ type: "ok", msg });
  const fail = (msg: string) => setToast({ type: "err", msg });

  /* ── Data fetching ── */

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/locations", { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) setLocations(json.data);
      else fail(json.message || "Failed to load locations");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      fail("Network error — could not load locations");
    } finally { setLoading(false); }
  };

  useEffect(() => { const ac = new AbortController(); load(ac.signal); return () => ac.abort(); }, []);

  /* ── Stats ── */

  const stats = useMemo(() => ({
    total: locations.length,
    active: locations.filter((l) => l.is_active).length,
    defaultName: locations.find((l) => l.is_default)?.name || "None",
  }), [locations]);

  /* ── CRUD helpers ── */

  const addLocation = async () => {
    if (!addForm.name.trim()) return fail("Name is required");
    if (!addForm.address.trim()) return fail("Address is required");
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, state: addForm.state.toUpperCase() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) { await load(); setShowAdd(false); setAddForm({ ...blank }); ok("Location added!"); }
      else fail(json.message || "Failed to add");
    } catch { fail("Network error"); }
    finally { setSaving(false); }
  };

  const saveEdit = async () => {
    if (!editId) return;
    if (!editForm.name.trim()) return fail("Name is required");
    if (!editForm.address.trim()) return fail("Address is required");
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/locations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, ...editForm, state: editForm.state.toUpperCase() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && json.data) {
        setLocations((prev) => prev.map((l) => (l.id === editId ? { ...l, ...json.data } : l)));
        setEditId(null); ok("Location updated!");
      } else fail(json.message || "Failed to update");
    } catch { fail("Network error"); }
    finally { setSaving(false); }
  };

  const toggleActive = async (loc: Location) => {
    setBusyId(loc.id);
    try {
      const res = await adminFetch("/api/admin/locations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: loc.id, is_active: !loc.is_active }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (json.success) {
        setLocations((prev) => prev.map((l) => l.id === loc.id ? { ...l, is_active: !l.is_active } : l));
        ok(`${loc.name} ${!loc.is_active ? "activated" : "deactivated"}`);
      } else fail(json.message || "Failed");
    } catch { fail("Network error"); }
    finally { setBusyId(null); }
  };

  const setDefault = async (loc: Location) => {
    setBusyId(loc.id);
    try {
      const res = await adminFetch("/api/admin/locations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: loc.id, is_default: true }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (json.success) {
        setLocations((prev) => prev.map((l) => ({ ...l, is_default: l.id === loc.id })));
        ok(`${loc.name} set as default`);
      } else fail(json.message || "Failed");
    } catch { fail("Network error"); }
    finally { setBusyId(null); }
  };

  const deleteLoc = async (loc: Location) => {
    if (!confirm(`Delete "${loc.name}"? This cannot be undone.`)) return;
    setBusyId(loc.id);
    try {
      const res = await adminFetch(`/api/admin/locations?id=${loc.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (json.success) { setLocations((prev) => prev.filter((l) => l.id !== loc.id)); if (editId === loc.id) setEditId(null); ok("Deleted"); }
      else fail(json.message || "Failed");
    } catch { fail("Network error"); }
    finally { setBusyId(null); }
  };

  const geocodeFromAddress = async (form: LocationForm, setForm: (f: LocationForm) => void) => {
    const addr = [form.address, form.city, form.state, form.zip].filter(Boolean).join(", ");
    if (!addr) return fail("Enter an address first");
    try {
      const res = await adminFetch(`/api/admin/geocode?address=${encodeURIComponent(addr)}`);
      const json = await res.json();
      if (json.success && json.results?.[0]) {
        setForm({ ...form, lat: json.results[0].lat, lng: json.results[0].lng });
        ok("Coordinates detected!");
      } else fail("Could not find coordinates");
    } catch { fail("Geocoding failed"); }
  };

  /* ── Form renderer ── */

  const renderForm = (form: LocationForm, setForm: (f: LocationForm) => void, isNew: boolean, onSave: () => void, onCancel: () => void) => (
    <Card className="mb-4 border-purple-200">
      <CardContent className="p-4">
        <h3 className="font-semibold text-gray-900 mb-3">{isNew ? "Add New Location" : `Edit: ${form.name}`}</h3>
        <div className="space-y-3">

          {/* Row 1: Name + Address */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-0.5 block">Location Name <span className="text-red-500">*</span></label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Downtown Office" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-0.5 block">Address <span className="text-red-500">*</span></label>
              <AddressAutocomplete
                value={form.address}
                onChange={(val) => setForm({ ...form, address: val })}
                onSelect={(r) => setForm({ ...form, address: r.address, city: r.city || form.city, state: r.state || form.state, zip: r.zip || form.zip, lat: r.lat || form.lat, lng: r.lng || form.lng, name: form.name || r.name || "" })}
              />
            </div>
          </div>

          {/* Row 2: City / State / ZIP */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-0.5 block">City</label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="e.g. New York" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-0.5 block">State</label>
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.slice(0, 2).toUpperCase() })} placeholder="e.g. NY" maxLength={2} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-0.5 block">ZIP</label>
              <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} placeholder="e.g. 10001" />
            </div>
          </div>

          {/* Row 3: Surcharge / Status */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-0.5 block">Surcharge ($)</label>
              <Input type="number" value={form.surcharge} onChange={(e) => setForm({ ...form, surcharge: e.target.value === "" ? 0 : Number(e.target.value) })} min="0" step="0.01" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-0.5 block">Status</label>
              <select value={form.is_active ? "active" : "inactive"} onChange={(e) => setForm({ ...form, is_active: e.target.value === "active" })}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Coordinates */}
          <div className="border border-gray-200 rounded-lg p-3">
            <label className="text-xs font-medium text-gray-700 block mb-2">Coordinates</label>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Latitude</label>
                <Input type="number" step="any" value={form.lat ?? ""} onChange={(e) => setForm({ ...form, lat: e.target.value ? parseFloat(e.target.value) : null })} placeholder="40.7128" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Longitude</label>
                <Input type="number" step="any" value={form.lng ?? ""} onChange={(e) => setForm({ ...form, lng: e.target.value ? parseFloat(e.target.value) : null })} placeholder="-74.0060" />
              </div>
            </div>
            <button type="button" onClick={() => geocodeFromAddress(form, setForm)} className="text-xs text-purple-600 hover:text-purple-800">Auto-detect from address</button>
          </div>

          {/* Default checkbox */}
          <div className="flex items-center gap-2 border border-purple-200 rounded-lg p-2.5 bg-purple-50/50">
            <input type="checkbox" id={`def-${isNew ? "new" : "edit"}`} checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
            <label htmlFor={`def-${isNew ? "new" : "edit"}`} className="text-sm font-medium text-gray-700">Set as default pickup/dropoff location</label>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-0.5 block">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Business hours: 9AM-6PM" rows={2}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <Button onClick={onSave} disabled={saving} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} {saving ? "Saving..." : "Save"}
            </Button>
            <Button onClick={onCancel} disabled={saving} variant="outline" className="text-gray-700">Cancel</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  /* ── Main render ── */
  return (
    <PageContainer>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`rounded-lg p-3 text-sm shadow-lg border ${toast.type === "ok" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
            {toast.msg}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="h-8 w-8 text-purple-600" /> Locations
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage pickup and dropoff locations</p>
        </div>
        <Button onClick={() => { setEditId(null); setShowAdd(!showAdd); if (showAdd) setAddForm({ ...blank }); }}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="h-4 w-4" /> Add Location
        </Button>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-3">
          <Card><CardContent className="p-4"><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Locations</p><p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active</p><p className="text-3xl font-bold text-green-600 mt-1">{stats.active}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Default Location</p><p className="text-lg font-bold text-gray-900 mt-1 truncate">{stats.defaultName}</p></CardContent></Card>
        </div>
      )}

      {/* Add form */}
      {showAdd && renderForm(addForm, setAddForm, true, addLocation, () => { setShowAdd(false); setAddForm({ ...blank }); })}

      {/* Edit form */}
      {editId && renderForm(editForm, setEditForm, false, saveEdit, () => setEditId(null))}

      {/* Table / empty */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 text-purple-600 animate-spin" /></div>
      ) : locations.length === 0 ? (
        <Card><CardContent className="p-8 text-center"><MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No locations yet. Click "Add Location" to create one.</p></CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Address</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Surcharge</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Default</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((loc) => (
                    <tr key={loc.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {loc.lat != null && loc.lng != null && <span title="Has coordinates">📍</span>}
                          {loc.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <p className="text-sm">{loc.address}</p>
                        <p className="text-xs text-gray-500">{[loc.city, loc.state].filter(Boolean).join(", ")} {loc.zip}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{loc.surcharge > 0 ? `$${loc.surcharge.toFixed(2)}` : "Free"}</td>
                      <td className="px-4 py-3">
                        {loc.is_default
                          ? <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1 w-fit"><Star className="h-3 w-3" /> Default</Badge>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={loc.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>{loc.is_active ? "Active" : "Inactive"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!loc.is_default && (
                            <button onClick={() => setDefault(loc)} disabled={busyId === loc.id} title="Set as default" className="p-1.5 hover:bg-purple-50 rounded-lg text-gray-600 hover:text-purple-600 transition-colors disabled:opacity-50">
                              {busyId === loc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                            </button>
                          )}
                          <button onClick={() => toggleActive(loc)} disabled={busyId === loc.id} title={loc.is_active ? "Deactivate" : "Activate"} className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50">
                            {busyId === loc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : loc.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                          </button>
                          <button onClick={() => { setShowAdd(false); setEditId(loc.id); setEditForm({ name: loc.name, address: loc.address, city: loc.city, state: loc.state, zip: loc.zip, lat: loc.lat ?? null, lng: loc.lng ?? null, surcharge: loc.surcharge, is_default: loc.is_default, is_active: loc.is_active, notes: loc.notes || "" }); }}
                            disabled={saving} title="Edit" className="p-1.5 hover:bg-amber-50 rounded-lg text-gray-600 hover:text-amber-600 transition-colors disabled:opacity-50">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => deleteLoc(loc)} disabled={busyId === loc.id} title="Delete" className="p-1.5 hover:bg-red-50 rounded-lg text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50">
                            {busyId === loc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
