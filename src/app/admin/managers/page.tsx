"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Shield, Plus, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/layout/page-container";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { featureFlags } from "@/lib/config/feature-flags";
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
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

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
        setMessage("Manager access created.");
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

  const toggleAccess = useCallback(async (managerId: string, enabled: boolean) => {
    try {
      const res = await adminFetch("/api/admin/managers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managerId, enabled }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        await fetchManagers();
      }
    } catch (error) {
      logger.error("Failed to update manager access:", error);
    }
  }, [fetchManagers]);

  if (!featureFlags.adminManagerAccessUi()) {
    return (
      <PageContainer className="py-10">
        <Card><CardContent className="p-6 text-center"><p className="text-gray-500">Manager access UI is currently disabled.</p></CardContent></Card>
      </PageContainer>
    );
  }

  return (
    <>
      <section className="bg-gradient-to-br from-gray-900 to-purple-900 py-6 sm:py-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Manager Access</h1>
            <p className="mt-1 text-sm sm:text-base text-purple-200">Create and revoke manager accounts from Admin panel.</p>
          </div>
          <Button variant="outline" size="sm" className="border-purple-400 text-purple-200 hover:bg-purple-800 hidden sm:inline-flex" onClick={fetchManagers}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </section>

      <PageContainer className="py-6 sm:py-8 space-y-6">
        <Card>
          <CardContent className="p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-purple-600" /> Create Manager</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input placeholder="Name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
              <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
              <Input placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
              <Button onClick={createManager} disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
            </div>
            {message && <p className="text-sm text-gray-600 mt-3">{message}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Shield className="h-4 w-4 text-purple-600" /> Existing Managers</h2>
            {loading ? (
              <div className="text-center py-8"><RefreshCw className="h-6 w-6 animate-spin text-purple-600 mx-auto" /></div>
            ) : managers.length === 0 ? (
              <p className="text-gray-500">No manager accounts created yet.</p>
            ) : (
              <div className="space-y-3">
                {managers.map((manager) => (
                  <div key={manager.id} className="rounded-lg border p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{manager.name}</p>
                      <p className="text-sm text-gray-500">{manager.email}</p>
                    </div>
                    <Button
                      variant={manager.manager_access_enabled ? "outline" : "default"}
                      onClick={() => toggleAccess(manager.id, !manager.manager_access_enabled)}
                    >
                      {manager.manager_access_enabled ? "Revoke Access" : "Enable Access"}
                    </Button>
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
