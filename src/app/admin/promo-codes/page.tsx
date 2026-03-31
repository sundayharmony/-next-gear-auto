"use client";

import React, { useEffect, useState } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { Tag, Plus, Pencil, Trash2, Check, X, RefreshCw, Loader2, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { logger } from "@/lib/utils/logger";
import { useAutoToast } from "@/lib/hooks/useAutoToast";

interface PromoCode {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minBookingAmount: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  description: string;
  isActive?: boolean;
}

export default function AdminPromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PromoCode>>({});
  const { error, setError, setSuccess } = useAutoToast();
  const [newCode, setNewCode] = useState<Partial<PromoCode>>({
    code: "",
    discountType: "percentage",
    discountValue: 10,
    minBookingAmount: 0,
    maxUses: 100,
    description: "",
    expiresAt: "",
  });


  const fetchCodes = async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/promo-codes");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) setCodes(data.data);
    } catch (err) {
      logger.error("Failed to fetch promo codes:", err);
      setError("Failed to load promo codes");
    }
    setLoading(false);
  };

  useEffect(() => { fetchCodes(); }, []);

  const addCode = async () => {
    // Validation
    if (!newCode.code || !newCode.code.trim()) {
      setError("Code is required");
      return;
    }
    if (!newCode.discountValue || newCode.discountValue <= 0) {
      setError("Discount value must be greater than 0");
      return;
    }
    if (newCode.discountType === "percentage" && newCode.discountValue > 100) {
      setError("Percentage discount cannot exceed 100%");
      return;
    }
    if (newCode.maxUses && newCode.maxUses <= 0) {
      setError("Max uses must be greater than 0 if set");
      return;
    }

    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCode),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        await fetchCodes();
        setShowAddForm(false);
        setNewCode({ code: "", discountType: "percentage", discountValue: 10, minBookingAmount: 0, maxUses: 100, description: "", expiresAt: "" });
        setSuccess("Promo code created successfully");
      } else {
        setError(data.message || "Failed to create code");
      }
    } catch {
      setError("Network error — could not create promo code");
    }
    setSaving(false);
  };

  const saveEdit = async () => {
    if (!editingCode) return;

    // Validation
    if (!editForm.discountValue || editForm.discountValue <= 0) {
      setError("Discount value must be greater than 0");
      return;
    }
    if (editForm.discountType === "percentage" && editForm.discountValue > 100) {
      setError("Percentage discount cannot exceed 100%");
      return;
    }
    if (editForm.maxUses && editForm.maxUses <= 0) {
      setError("Max uses must be greater than 0 if set");
      return;
    }

    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/promo-codes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: editingCode, ...editForm }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setCodes((prev) => prev.map((c) => c.code === editingCode ? { ...c, ...editForm } : c));
        setEditingCode(null);
        setSuccess("Promo code updated successfully");
      } else {
        setError(data.message || "Failed to update promo code");
      }
    } catch {
      setError("Network error — could not update promo code");
    } finally {
      setSaving(false);
    }
  };

  const deleteCode = async (code: string) => {
    if (!confirm(`Delete promo code "${code}"?`)) return;
    try {
      const res = await adminFetch(`/api/admin/promo-codes?code=${code}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setCodes((prev) => prev.filter((c) => c.code !== code));
      } else {
        setError(data.message || "Failed to delete promo code");
      }
    } catch {
      setError("Network error — could not delete promo code");
    }
  };

  return (
    <>
      <section className="bg-gradient-to-br from-gray-900 to-purple-900 py-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Promo Codes</h1>
              <p className="mt-1 text-purple-200">{codes.length} promo codes</p>
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-white text-purple-900 hover:bg-gray-100">
              <Plus className="h-4 w-4 mr-1" /> New Code
            </Button>
          </div>
        </div>
      </section>

      <PageContainer className="py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss error" className="text-red-400 hover:text-red-600 ml-3">&times;</button>
          </div>
        )}

        {/* Add Form */}
        {showAddForm && (
          <Card className="mb-6 border-green-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Create Promo Code</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Code <span className="text-red-500">*</span></label>
                  <Input value={newCode.code || ""} onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })} placeholder="e.g. SUMMER20" className="uppercase focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Discount Type</label>
                  <select value={newCode.discountType} onChange={(e) => setNewCode({ ...newCode, discountType: e.target.value as "percentage" | "fixed" })} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Discount Value</label>
                  <Input type="number" value={newCode.discountValue || 0} onChange={(e) => setNewCode({ ...newCode, discountValue: Number(e.target.value) })} className="focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Min Booking ($)</label>
                  <Input type="number" value={newCode.minBookingAmount || 0} onChange={(e) => setNewCode({ ...newCode, minBookingAmount: Number(e.target.value) })} className="focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Max Uses</label>
                  <Input type="number" value={newCode.maxUses || 100} onChange={(e) => setNewCode({ ...newCode, maxUses: Number(e.target.value) })} className="focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Expires At</label>
                  <Input type="date" min={new Date().toISOString().split('T')[0]} value={newCode.expiresAt || ""} onChange={(e) => setNewCode({ ...newCode, expiresAt: e.target.value })} className="focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
                  <Input value={newCode.description || ""} onChange={(e) => setNewCode({ ...newCode, description: e.target.value })} placeholder="e.g. Summer 2026 special offer" className="focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={addCode} disabled={saving || !newCode.code}>{saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : "Create Code"}</Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={fetchCodes} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Code</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Discount</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Min Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Usage</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Expires</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : codes.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Package className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">No promo codes yet</p>
                      <p className="text-gray-400 text-sm">Create your first promo code to get started</p>
                    </div>
                  </td></tr>
                ) : (
                  codes.map((c) => (
                    <tr key={c.code} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      {editingCode === c.code ? (
                        <>
                          <td className="px-4 py-3"><Badge className="bg-purple-100 text-purple-700 font-mono">{c.code}</Badge></td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <select value={editForm.discountType || c.discountType} onChange={(e) => setEditForm({ ...editForm, discountType: e.target.value as "percentage" | "fixed" })} className="rounded border px-1 py-1 text-xs h-8 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                                <option value="percentage">%</option>
                                <option value="fixed">$</option>
                              </select>
                              <Input type="number" value={editForm.discountValue ?? c.discountValue} onChange={(e) => setEditForm({ ...editForm, discountValue: Number(e.target.value) })} className="h-8 text-sm w-16 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                            </div>
                          </td>
                          <td className="px-4 py-3"><Input type="number" value={editForm.minBookingAmount ?? c.minBookingAmount} onChange={(e) => setEditForm({ ...editForm, minBookingAmount: Number(e.target.value) })} className="h-8 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" /></td>
                          <td className="px-4 py-3"><Input type="number" value={editForm.maxUses ?? c.maxUses} onChange={(e) => setEditForm({ ...editForm, maxUses: Number(e.target.value) })} className="h-8 text-sm w-16 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" /></td>
                          <td className="px-4 py-3"><Input type="date" min={new Date().toISOString().split('T')[0]} value={editForm.expiresAt ?? c.expiresAt ?? ""} onChange={(e) => setEditForm({ ...editForm, expiresAt: e.target.value })} className="h-8 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" /></td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={saveEdit} disabled={saving}>{saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />} Save</Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingCode(null)} aria-label="Cancel edit"><X className="h-3 w-3" /></Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-purple-100 text-purple-700 font-mono font-medium tracking-wide">{c.code}</Badge>
                            </div>
                            {c.description && <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {c.discountType === "percentage" ? `${c.discountValue}%` : `$${c.discountValue}`}
                          </td>
                          <td className="px-4 py-3 text-gray-600">${c.minBookingAmount || 0}</td>
                          <td className="px-4 py-3">
                            <span className="text-gray-900">{c.usedCount || 0}</span>
                            <span className="text-gray-400"> / {c.maxUses}</span>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <div className="flex items-center gap-2">
                              {c.expiresAt ? (
                                <>
                                  <span className={new Date(c.expiresAt + "T12:00:00") < new Date() ? "text-red-600 line-through font-medium" : "text-gray-600"}>
                                    {new Date(c.expiresAt + "T12:00:00").toLocaleDateString()}
                                  </span>
                                  {new Date(c.expiresAt + "T12:00:00") < new Date() && (
                                    <Badge className="bg-red-100 text-red-700 text-[10px]">Expired</Badge>
                                  )}
                                </>
                              ) : (
                                <span className="text-gray-500">No expiry</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setEditingCode(c.code); setEditForm({ ...c }); }}>
                                <Pencil className="h-3 w-3 mr-1" /> Edit
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-red-600" onClick={() => deleteCode(c.code)}>
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
