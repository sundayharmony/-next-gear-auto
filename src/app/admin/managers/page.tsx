"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Shield, Plus, RefreshCw, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/layout/page-container";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { logger } from "@/lib/utils/logger";
interface ManagerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  manager_access_enabled: boolean;
  manager_access_granted_at?: string | null;
  manager_access_revoked_at?: string | null;
}

export default function AdminManagersPage() {
  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
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
    setMessage("");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    if (!editForm.name.trim() || !editForm.email.trim()) {
      setMessage("Name and email are required.");
      return;
    }
    setSaving(true);
    setMessage("");
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
        setMessage("Manager updated.");
        setEditingId(null);
        await fetchManagers();
      } else {
        setMessage(json.message || "Failed to update manager.");
      }
    } catch (error) {
      logger.error("Failed to update manager:", error);
      setMessage("Failed to update manager.");
    } finally {
      setSaving(false);
    }
  }, [editingId, editForm, fetchManagers]);

  const createManager = useCallback(async () => {
    if (!form.name || !form.email) {
      setMessage("Name and email are required.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const res = await adminFetch("/api/admin/managers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMessage(json.message || "Manager access created.");
        setForm({ name: "", email: "", phone: "" });
        await fetchManagers();
      } else {
        setMessage(json.message || "Failed to create manager.");
      }
    } catch (error) {
      logger.error("Failed to create manager:", error);
      setMessage("Failed to create manager.");
    } finally {
      setSaving(false);
    }
  }, [fetchManagers, form]);

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
      setMessage("");
      try {
        const res = await adminFetch(`/api/admin/managers/${managerId}`, { method: "DELETE" });
        const json = await res.json();
        if (res.ok && json.success) {
          setMessage(json.message || "Manager removed.");
          if (editingId === managerId) setEditingId(null);
          await fetchManagers();
        } else {
          setMessage(json.message || "Failed to remove manager.");
        }
      } catch (error) {
        logger.error("Failed to remove manager:", error);
        setMessage("Failed to remove manager.");
      } finally {
        setRemovingId(null);
      }
    },
    [fetchManagers, editingId]
  );

  return (
    <>
      <section className="bg-gradient-to-br from-gray-900 to-purple-900 py-6 sm:py-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Managers</h1>
            <p className="mt-1 text-sm sm:text-base text-purple-200">
              Add, edit, or remove manager accounts. Removing a manager keeps their customer account.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-purple-400 text-purple-200 hover:bg-purple-800 hidden sm:inline-flex"
            onClick={fetchManagers}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </section>

      <PageContainer className="py-6 sm:py-8 space-y-6">
        <Card>
          <CardContent className="p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
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
            {message && <p className="text-sm text-gray-600 mt-3">{message}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-600" /> Current managers
            </h2>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-purple-600 mx-auto" />
              </div>
            ) : managers.length === 0 ? (
              <p className="text-gray-500">No manager accounts yet.</p>
            ) : (
              <div className="space-y-3">
                {managers.map((manager) => (
                  <div key={manager.id} className="rounded-lg border border-gray-200 p-4">
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
                          <p className="font-semibold text-gray-900">{manager.name}</p>
                          <p className="text-sm text-gray-500 truncate">{manager.email}</p>
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
          </CardContent>
        </Card>
      </PageContainer>
    </>
  );
}
