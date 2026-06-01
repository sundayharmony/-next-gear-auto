"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  UserPlus,
  Car,
  Wallet,
  Loader2,
  Save,
  DollarSign,
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
import { formatCurrency, formatDate } from "@/lib/utils/date-helpers";
import {
  PayoutStatusBadge,
  OwnerStatusBadge,
} from "@/components/owner/owner-shared";
import type { OwnerBooking, OwnerVehicle, PayoutStatus } from "@/lib/types";

interface AdminOwner {
  id: string;
  name: string;
  email: string;
  phone: string;
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
      if (oJson.success) setOwners(oJson.data || []);
      if (vJson.success) setVehicles(vJson.data || []);
    } catch {
      showToast("error", "Load failed", "Could not load owners.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  // Map each assigned vehicle to its owner + percentage (from owners data).
  const assignment = useMemo(() => {
    const map = new Map<string, { ownerId: string; pct: number }>();
    for (const o of owners) {
      for (const v of o.vehicles) {
        map.set(v.id, { ownerId: o.id, pct: v.ownerPercentage });
      }
    }
    return map;
  }, [owners]);

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
                    <AdminCard key={o.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-900">{o.name}</p>
                          <p className="truncate text-xs text-gray-500">{o.email}</p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => setPayoutsOwner(o)}>
                          <Wallet className="h-4 w-4" /> Payouts
                        </Button>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-gray-50 p-2">
                          <p className="flex items-center justify-center gap-1 text-sm font-bold text-gray-900"><Car className="h-3.5 w-3.5 text-purple-600" />{o.vehicleCount}</p>
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
  assignment: Map<string, { ownerId: string; pct: number }>;
  onSaved: () => void;
}) {
  const { showToast } = useNotification();
  const [drafts, setDrafts] = useState<Record<string, { ownerId: string; pct: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const getDraft = (vId: string) => {
    if (drafts[vId]) return drafts[vId];
    const a = assignment.get(vId);
    return { ownerId: a?.ownerId ?? "", pct: String(a?.pct ?? 70) };
  };

  const setDraft = (vId: string, patch: Partial<{ ownerId: string; pct: string }>) => {
    setDrafts((prev) => ({ ...prev, [vId]: { ...getDraft(vId), ...patch } }));
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
          ownerId: draft.ownerId || null,
          ownerPercentage: Number(draft.pct),
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
            return (
              <tr key={v.id} className="border-b border-gray-100">
                <td className="px-4 py-3 text-gray-900">{v.year} {v.make} {v.model}</td>
                <td className="px-4 py-3">
                  <Select value={draft.ownerId} onChange={(e) => setDraft(v.id, { ownerId: e.target.value })} className="min-w-[160px]">
                    <option value="">Unassigned</option>
                    {owners.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.pct}
                    onChange={(e) => setDraft(v.id, { pct: e.target.value })}
                    className="w-24"
                    disabled={!draft.ownerId}
                  />
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
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/owners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password: password || undefined }),
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
          <Input label="Password (optional)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} hint="Leave blank to let them set it via password reset." />
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

function ManagePayoutsModal({ owner, onClose, onChanged }: { owner: AdminOwner | null; onClose: () => void; onChanged: () => void }) {
  const { showToast } = useNotification();
  const [bookings, setBookings] = useState<OwnerBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (ownerId: string) => {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/owner-payouts?ownerId=${encodeURIComponent(ownerId)}`);
      const json = await res.json();
      if (json.success) setBookings(json.data || []);
    } catch {
      showToast("error", "Load failed", "Could not load payouts.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (owner) load(owner.id);
    else setBookings([]);
  }, [owner, load]);

  const updateStatus = async (booking: OwnerBooking, status: PayoutStatus) => {
    setBusyId(booking.id);
    try {
      const res = await adminFetch("/api/admin/owner-payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, status }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("success", "Payout updated", `Marked ${status}.`);
        if (owner) await load(owner.id);
        onChanged();
      } else {
        showToast("error", "Update failed", json.message || "Try again.");
      }
    } catch {
      showToast("error", "Update failed", "Network error.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal open={!!owner} onOpenChange={(o) => { if (!o) onClose(); }}>
      <ModalContent className="max-w-2xl">
        <ModalHeader>
          <ModalTitle>{owner ? `Payouts — ${owner.name}` : "Payouts"}</ModalTitle>
        </ModalHeader>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-7 w-7 animate-spin text-purple-600" /></div>
        ) : bookings.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">No bookings for this owner&apos;s vehicles.</p>
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {bookings.map((b) => (
              <div key={b.id} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{b.vehicleName}</p>
                    <p className="text-xs text-gray-500">{formatDate(b.pickupDate)} → {formatDate(b.returnDate)}</p>
                  </div>
                  <OwnerStatusBadge status={b.status} />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-purple-600" />
                    <span className="font-semibold tabular-nums text-gray-900">{formatCurrency(b.ownerPayout)}</span>
                    <PayoutStatusBadge status={b.payoutStatus} />
                  </div>
                  <div className="flex gap-1">
                    {(["pending", "issued", "paid"] as PayoutStatus[]).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={b.payoutStatus === s ? "default" : "ghost"}
                        disabled={busyId === b.id}
                        onClick={() => updateStatus(b, s)}
                        className="capitalize"
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}
