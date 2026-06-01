"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  UserPlus,
  Car,
  Wallet,
  Loader2,
  Save,
  ChevronRight,
} from "lucide-react";
import {
  AdminPageHeader,
  AdminPageBody,
  AdminCard,
  AdminSection,
  AdminTableWrap,
} from "@/components/admin/admin-shell";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { useNotification } from "@/lib/context/notification-context";
import { validatePassword, PASSWORD_REQUIREMENTS } from "@/lib/auth/password-policy";
import { formatCurrency } from "@/lib/utils/date-helpers";
import type { OwnerVehicle } from "@/lib/types";
import { COMPANY_OWNED_OWNER_ID } from "@/lib/owner/ownership";
import { ManagePayoutsModal } from "./components/ManagePayoutsModal";
import { SendPasswordEmailButton } from "./components/SendPasswordEmailButton";

interface AdminOwner {
  id: string;
  name: string;
  email: string;
  phone: string;
  accountActivated?: boolean;
  vehicleCount: number;
  vehicles: OwnerVehicle[];
  lifetimeRevenue: number;
  lifetimePayouts: number;
  pendingPayouts: number;
}
interface AdminVehicle {
  id: string;
  year: number;
  make: string;
  model: string;
}

export default function AdminOwnersPage() {
  const { showToast } = useNotification();
  const [owners, setOwners] = useState<AdminOwner[]>([]);
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [vehicleAssignments, setVehicleAssignments] = useState<
    Record<string, { ownerId: string | null; isCompanyOwned: boolean; ownerPercentage: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [payoutsOwner, setPayoutsOwner] = useState<AdminOwner | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, vRes] = await Promise.all([
        adminFetch("/api/admin/owners"),
        adminFetch("/api/admin/vehicles"),
      ]);
      const oJson = await oRes.json();
      const vJson = await vRes.json();
      if (oJson.success) {
        setOwners(oJson.data || []);
        setVehicleAssignments(oJson.vehicleAssignments || {});
      }
      if (vJson.success) setVehicles(vJson.data || []);
    } catch {
      showToast("error", "Load failed", "Could not load owners.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const assignment = useMemo(() => {
    const map = new Map<string, { ownerId: string; isCompanyOwned: boolean; pct: number }>();
    for (const [vehicleId, a] of Object.entries(vehicleAssignments)) {
      map.set(vehicleId, {
        ownerId: a.isCompanyOwned ? COMPANY_OWNED_OWNER_ID : (a.ownerId ?? ""),
        isCompanyOwned: a.isCompanyOwned,
        pct: a.ownerPercentage,
      });
    }
    return map;
  }, [vehicleAssignments]);

  return (
    <>
      <AdminPageHeader
        title="Owners"
        subtitle="Manage vehicle owners, assignments, revenue shares and payouts"
        backHref="/admin"
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" /> Add Owner
          </Button>
        }
      />
      <AdminPageBody>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>
        ) : (
          <>
            <AdminSection title="Owner accounts" description={`${owners.length} owner(s)`}>
              {owners.length === 0 ? (
                <AdminCard><p className="py-6 text-center text-sm text-gray-500">No owners yet. Add one to get started.</p></AdminCard>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {owners.map((o) => (
                    <AdminCard key={o.id} hover className="group relative p-0 overflow-hidden">
                      <Link
                        href={`/admin/owners/${o.id}`}
                        className="block cursor-pointer p-5 transition-colors hover:bg-purple-50/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-gray-900 group-hover:text-purple-900">
                              {o.name}
                            </p>
                            <p className="truncate text-xs text-gray-500">{o.email}</p>
                          </div>
                          <ChevronRight
                            className="h-5 w-5 shrink-0 text-gray-300 transition-colors group-hover:text-purple-500"
                            aria-hidden
                          />
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-lg bg-gray-50 p-2">
                            <p className="flex items-center justify-center gap-1 text-sm font-bold text-gray-900">
                              <Car className="h-3.5 w-3.5 text-purple-600" />
                              {o.vehicleCount}
                            </p>
                            <p className="text-[11px] text-gray-500">Vehicles</p>
                          </div>
                          <div className="rounded-lg bg-gray-50 p-2">
                            <p className="text-sm font-bold text-gray-900">{formatCurrency(o.lifetimeRevenue)}</p>
                            <p className="text-[11px] text-gray-500">Revenue</p>
                          </div>
                          <div className="rounded-lg bg-amber-50 p-2">
                            <p className="text-sm font-bold text-amber-700">{formatCurrency(o.pendingPayouts)}</p>
                            <p className="text-[11px] text-gray-500">Pending</p>
                          </div>
                        </div>
                      </Link>
                      <div className="border-t border-gray-100 px-4 py-2 flex gap-2">
                        <SendPasswordEmailButton
                          ownerId={o.id}
                          ownerEmail={o.email}
                          accountActivated={o.accountActivated}
                          fullWidth
                          className="flex-1"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          onClick={() => setPayoutsOwner(o)}
                        >
                          <Wallet className="h-4 w-4" /> Payouts
                        </Button>
                      </div>
                    </AdminCard>
                  ))}
                </div>
              )}
            </AdminSection>

            <AdminSection title="Vehicle assignments" description="Assign vehicles to owners and set each owner's revenue share.">
              <VehicleAssignments
                vehicles={vehicles}
                owners={owners}
                assignment={assignment}
                onSaved={load}
              />
            </AdminSection>
          </>
        )}
      </AdminPageBody>

      <AddOwnerModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={load} />
      <ManagePayoutsModal owner={payoutsOwner} onClose={() => setPayoutsOwner(null)} onChanged={load} />
    </>
  );
}

function VehicleAssignments({
  vehicles,
  owners,
  assignment,
  onSaved,
}: {
  vehicles: AdminVehicle[];
  owners: AdminOwner[];
  assignment: Map<string, { ownerId: string; isCompanyOwned: boolean; pct: number }>;
  onSaved: () => void;
}) {
  const { showToast } = useNotification();
  const [drafts, setDrafts] = useState<Record<string, { ownerId: string; pct: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const getDraft = (vId: string) => {
    if (drafts[vId]) return drafts[vId];
    const a = assignment.get(vId);
    return {
      ownerId: a?.ownerId ?? "",
      pct: String(a?.isCompanyOwned ? 0 : (a?.pct ?? 70)),
    };
  };

  const setDraft = (vId: string, patch: Partial<{ ownerId: string; pct: string }>) => {
    const base = getDraft(vId);
    const next = { ...base, ...patch };
    if (patch.ownerId === COMPANY_OWNED_OWNER_ID) {
      next.pct = "0";
    } else if (patch.ownerId !== undefined && patch.ownerId !== COMPANY_OWNED_OWNER_ID && !patch.ownerId) {
      next.pct = base.pct === "0" ? "70" : base.pct;
    } else if (patch.ownerId && patch.ownerId !== COMPANY_OWNED_OWNER_ID && base.ownerId === COMPANY_OWNED_OWNER_ID) {
      next.pct = "70";
    }
    setDrafts((prev) => ({ ...prev, [vId]: next }));
  };

  const save = async (vId: string) => {
    const draft = getDraft(vId);
    setSavingId(vId);
    try {
      const res = await adminFetch("/api/admin/owners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vId,
          ownerId: draft.ownerId === COMPANY_OWNED_OWNER_ID ? COMPANY_OWNED_OWNER_ID : draft.ownerId || null,
          ownerPercentage:
            draft.ownerId === COMPANY_OWNED_OWNER_ID ? 0 : Number(draft.pct),
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("success", "Saved", "Vehicle assignment updated.");
        onSaved();
      } else {
        showToast("error", "Save failed", json.message || "Try again.");
      }
    } catch {
      showToast("error", "Save failed", "Network error.");
    } finally {
      setSavingId(null);
    }
  };

  if (vehicles.length === 0) {
    return <AdminCard><p className="py-6 text-center text-sm text-gray-500">No vehicles found.</p></AdminCard>;
  }

  return (
    <AdminTableWrap>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
            <th className="px-4 py-3 font-semibold">Vehicle</th>
            <th className="px-4 py-3 font-semibold">Owner</th>
            <th className="px-4 py-3 font-semibold">Owner %</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => {
            const draft = getDraft(v.id);
            const isCompanyOwned = draft.ownerId === COMPANY_OWNED_OWNER_ID;
            return (
              <tr key={v.id} className="border-b border-gray-100">
                <td className="px-4 py-3 text-gray-900">{v.year} {v.make} {v.model}</td>
                <td className="px-4 py-3">
                  <Select value={draft.ownerId} onChange={(e) => setDraft(v.id, { ownerId: e.target.value })} className="min-w-[180px]">
                    <option value="">Unassigned</option>
                    <option value={COMPANY_OWNED_OWNER_ID}>Company owned</option>
                    {owners.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </Select>
                </td>
                <td className="px-4 py-3">
                  {isCompanyOwned ? (
                    <span className="text-sm text-gray-500">—</span>
                  ) : (
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={draft.pct}
                      onChange={(e) => setDraft(v.id, { pct: e.target.value })}
                      className="w-24"
                      disabled={!draft.ownerId}
                    />
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="secondary" onClick={() => save(v.id)} disabled={savingId === v.id}>
                    {savingId === v.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </AdminTableWrap>
  );
}

function AddOwnerModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { showToast } = useNotification();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setName(""); setEmail(""); setPhone(""); setPassword(""); };

  const submit = async () => {
    if (!name.trim() || !email.trim()) {
      showToast("error", "Missing info", "Name and email are required.");
      return;
    }
    const trimmedPassword = password.trim();
    if (trimmedPassword) {
      const pwCheck = validatePassword(trimmedPassword);
      if (!pwCheck.valid) {
        showToast("error", "Invalid password", pwCheck.message);
        return;
      }
    }
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/owners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          password: trimmedPassword || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("success", "Owner saved", json.message || "Owner created.");
        reset();
        onCreated();
        onClose();
      } else {
        showToast("error", "Could not save", json.message || "Try again.");
      }
    } catch {
      showToast("error", "Could not save", "Network error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Add Owner</ModalTitle>
        </ModalHeader>
        <div className="space-y-3">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Owner" />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@example.com" />
          <Input label="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input
            label="Password (optional)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint={`Leave blank to let them set it via password reset. If set: ${PASSWORD_REQUIREMENTS}`}
          />
          <p className="text-xs text-gray-500">If the email already exists, that account is promoted to an owner.</p>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save owner</Button>
        </div>
      </ModalContent>
    </Modal>
  );
}

