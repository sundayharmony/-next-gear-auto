"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Shield, Plus, RefreshCw, Pencil, Trash2, CheckCircle2, Clock } from "lucide-react";
import { AdminPageHeader, AdminPageBody, AdminCard } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { logger } from "@/lib/utils/logger";
import { useAutoToast } from "@/lib/hooks/useAutoToast";
import { AdminStatusBanner, AdminEmptyState } from "@/components/admin/ui-feedback";
interface ManagerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  manager_access_enabled: boolean;
  manager_access_granted_at?: string | null;
  manager_access_revoked_at?: string | null;
  account_activated: boolean;
}

export default function AdminManagersPage() {
  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { error, setError, success, setSuccess } = useAutoToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });

  const fetchManagers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/managers");
      const json = await res.json();
      if (res.ok && json.success) {
        setManagers(json.data || []);
      }
    } catch (error) {
      logger.error("Failed to fetch managers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManagers();
  }, [fetchManagers]);

  const startEdit = (m: ManagerRow) => {
    setEditingId(m.id);
    setEditForm({
      name: m.name || "",
      email: m.email || "",
      phone: m.phone || "",
    });
    setError(null);
    setSuccess(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    if (!editForm.name.trim() || !editForm.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await adminFetch(`/api/admin/managers/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          email: editForm.email.trim().toLowerCase(),
          phone: editForm.phone.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccess("Manager updated.");
        setEditingId(null);
        await fetchManagers();
      } else {
        setError(json.message || "Failed to update manager.");
      }
    } catch (error) {
      logger.error("Failed to update manager:", error);
      setError("Failed to update manager.");
    } finally {
      setSaving(false);
    }
  }, [editingId, editForm, fetchManagers, setError, setSuccess]);

  const createManager = useCallback(async () => {
    if (!form.name || !form.email) {
      setError("Name and email are required.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await adminFetch("/api/admin/managers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccess(json.message || "Manager access created.");
        setForm({ name: "", email: "", phone: "" });
        await fetchManagers();
      } else {
        setError(json.message || "Failed to create manager.");
      }
    } catch (error) {
      logger.error("Failed to create manager:", error);
      setError("Failed to create manager.");
    } finally {
      setSaving(false);
    }
  }, [fetchManagers, form, setError, setSuccess]);

  const removeManager = useCallback(
    async (managerId: string, email: string) => {
      if (
        !window.confirm(
          `Remove manager access for ${email}? Their account will become a regular customer and they will lose manager panel access.`
        )
      ) {
        return;
      }
      setRemovingId(managerId);
      setError(null);
      setSuccess(null);
      try {
        const res = await adminFetch(`/api/admin/managers/${managerId}`, { method: "DELETE" });
        const json = await res.json();
        if (res.ok && json.success) {
          setSuccess(json.message || "Manager removed.");
          if (editingId === managerId) setEditingId(null);
          await fetchManagers();
        } else {
          setError(json.message || "Failed to remove manager.");
        }
      } catch (error) {
        logger.error("Failed to remove manager:", error);
        setError("Failed to remove manager.");
      } finally {
        setRemovingId(null);
      }
    },
    [fetchManagers, editingId, setError, setSuccess]
  );

  return (
    <>
      <AdminPageHeader
        title="Managers"
        subtitle="Add, edit, or remove manager accounts. Activation means they have set a password and can sign in."
        actions={
          <Button
            variant="outline"
            size="sm"
            className="page-hero-btn-outline hidden sm:inline-flex"
            onClick={fetchManagers}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        }
      />

      <AdminPageBody>
        {error ? <AdminStatusBanner type="error" message={error} onDismiss={() => setError(null)} /> : null}
        {success ? <AdminStatusBanner type="success" message={success} onDismiss={() => setSuccess(null)} /> : null}

        <AdminCard>
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-purple-600" /> Add manager
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <Input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />
              <Input
                placeholder="Phone (optional)"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
              <Button onClick={createManager} disabled={saving}>
                {saving && !editingId ? "Saving…" : "Create"}
              </Button>
            </div>
          </AdminCard>

        <AdminCard>
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-600" /> Current managers
            </h2>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-purple-600 mx-auto" />
              </div>
            ) : managers.length === 0 ? (
              <AdminEmptyState
                title="No manager accounts yet"
                description="Add your first manager above to grant panel access."
              />
            ) : (
              <div className="space-y-3">
                {managers.map((manager) => (
                  <div key={manager.id} className="rounded-xl border border-gray-200/80 bg-gray-50/40 p-4 transition-colors hover:border-purple-200/80 hover:bg-purple-50/25">
                    {editingId === manager.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Input
                            placeholder="Name"
                            value={editForm.name}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                          />
                          <Input
                            type="email"
                            placeholder="Email"
                            value={editForm.email}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                          />
                          <Input
                            placeholder="Phone"
                            value={editForm.phone}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={saveEdit} disabled={saving}>
                            {saving ? "Saving…" : "Save"}
                          </Button>
                          <Button size="sm" variant="outline" type="button" onClick={cancelEdit} disabled={saving}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-gray-900">{manager.name}</p>
                            {manager.account_activated ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                <CheckCircle2 className="h-3 w-3 mr-1" aria-hidden />
                                Activated
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-900 border-amber-200">
                                <Clock className="h-3 w-3 mr-1" aria-hidden />
                                Pending activation
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate">{manager.email}</p>
                          {!manager.account_activated ? (
                            <p className="text-xs text-amber-700 mt-1">
                              Has not set a password yet — resend the setup email from Customers if needed.
                            </p>
                          ) : null}
                          {manager.phone ? (
                            <p className="text-sm text-gray-600 mt-0.5">{manager.phone}</p>
                          ) : (
                            <p className="text-xs text-gray-400 mt-0.5">No phone on file</p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(manager)}>
                            <Pencil className="h-3.5 w-3.5 mr-1" aria-hidden />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-700 border-red-200 hover:bg-red-50"
                            onClick={() => removeManager(manager.id, manager.email)}
                            disabled={removingId === manager.id}
                          >
                            {removingId === manager.id ? (
                              "Removing…"
                            ) : (
                              <>
                                <Trash2 className="h-3.5 w-3.5 mr-1" aria-hidden />
                                Remove
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </AdminCard>
      </AdminPageBody>
    </>
  );
}
