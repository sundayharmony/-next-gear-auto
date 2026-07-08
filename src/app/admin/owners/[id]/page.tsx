"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Car,
  Wallet,
  Loader2,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  TrendingUp,
  Pencil,
  Save,
  X,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  AdminPageHeader,
  AdminPageBody,
  AdminCard,
  AdminSection,
  AdminStatCard,
  AdminTableWrap,
} from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { useNotification } from "@/lib/context/notification-context";
import { formatCurrency, formatDate } from "@/lib/utils/date-helpers";
import {
  PayoutStatusBadge,
  OwnerStatusBadge,
} from "@/components/owner/owner-shared";
import { getVehicleDisplayName } from "@/lib/types";
import type { EnrichedAdminOwner } from "@/lib/admin/owner-enrichment";
import { isOwnerTuroBooking } from "@/lib/owner/finance";
import { ManagePayoutsModal } from "../components/ManagePayoutsModal";
import { SendPasswordEmailButton } from "../components/SendPasswordEmailButton";
import { Badge } from "@/components/ui/badge";

export default function AdminOwnerDetailPage() {
  const params = useParams();
  const ownerId = typeof params.id === "string" ? params.id : "";
  const { showToast } = useNotification();

  const [owner, setOwner] = useState<EnrichedAdminOwner | null>(null);
  const [loading, setLoading] = useState(true);
  const [payoutsOpen, setPayoutsOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/owners/${encodeURIComponent(ownerId)}`);
      const json = await res.json();
      if (json.success && json.data) {
        setOwner(json.data);
      } else {
        showToast("error", "Not found", json.message || "Owner could not be loaded.");
        setOwner(null);
      }
    } catch {
      showToast("error", "Load failed", "Could not load owner.");
      setOwner(null);
    } finally {
      setLoading(false);
    }
  }, [ownerId, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = () => {
    if (!owner) return;
    setEditName(owner.name);
    setEditEmail(owner.email);
    setEditPhone(owner.phone);
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveProfile = async () => {
    if (!ownerId || !editName.trim() || !editEmail.trim()) {
      showToast("error", "Missing info", "Name and email are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/owners/${encodeURIComponent(ownerId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("success", "Saved", "Owner profile updated.");
        setOwner(json.data);
        setEditing(false);
      } else {
        showToast("error", "Save failed", json.message || "Try again.");
      }
    } catch {
      showToast("error", "Save failed", "Network error.");
    } finally {
      setSaving(false);
    }
  };

  if (!ownerId) {
    return (
      <>
        <AdminPageHeader title="Owner" backHref="/admin/owners" />
        <AdminPageBody>
          <AdminCard>
            <p className="py-8 text-center text-sm text-gray-500">Invalid owner link.</p>
          </AdminCard>
        </AdminPageBody>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={owner?.name || "Owner"}
        subtitle={owner?.email}
        backHref="/admin/owners"
        backLabel="All owners"
        actions={
          owner ? (
            <>
              <SendPasswordEmailButton
                ownerId={owner.id}
                ownerEmail={owner.email}
                accountActivated={owner.accountActivated}
              />
              <Button variant="secondary" size="sm" onClick={() => setPayoutsOpen(true)}>
                <Wallet className="h-4 w-4" /> Manage payouts
              </Button>
              {!editing ? (
                <Button variant="outline" size="sm" onClick={startEdit} className="page-hero-btn-outline">
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
              ) : null}
            </>
          ) : null
        }
      />
      <AdminPageBody>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : !owner ? (
          <AdminCard>
            <p className="py-8 text-center text-sm text-gray-500">
              Owner not found.{" "}
              <Link href="/admin/owners" className="text-purple-600 hover:underline">
                Back to owners
              </Link>
            </p>
          </AdminCard>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <AdminStatCard label="Lifetime revenue" value={formatCurrency(owner.lifetimeRevenue)} icon={DollarSign} />
              <AdminStatCard
                label="Lifetime payouts"
                value={formatCurrency(owner.lifetimePayouts)}
                icon={TrendingUp}
                iconClassName="text-emerald-600"
                iconBgClassName="bg-emerald-50"
              />
              <AdminStatCard
                label="Pending payouts"
                value={formatCurrency(owner.pendingPayouts)}
                icon={Wallet}
                iconClassName="text-amber-600"
                iconBgClassName="bg-amber-50"
              />
              <AdminStatCard label="Vehicles" value={owner.vehicleCount} icon={Car} />
            </div>

            <AdminSection title="Profile">
              <AdminCard>
                {editing ? (
                  <div className="space-y-3">
                    <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                    <Input label="Email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                    <Input label="Phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
                        <X className="h-4 w-4" /> Cancel
                      </Button>
                      <Button size="sm" onClick={saveProfile} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Name</dt>
                      <dd className="mt-1 flex flex-wrap items-center gap-2 font-semibold text-gray-900">
                        {owner.name}
                        {owner.accountActivated ? (
                          <Badge className="border-green-200 bg-green-100 text-green-800">
                            <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden />
                            Password set
                          </Badge>
                        ) : (
                          <Badge className="border-amber-200 bg-amber-100 text-amber-900">
                            <Clock className="mr-1 h-3 w-3" aria-hidden />
                            No password yet
                          </Badge>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Member since</dt>
                      <dd className="mt-1 flex items-center gap-1.5 text-gray-900">
                        <Calendar className="h-4 w-4 text-purple-600" />
                        {formatDate(owner.createdAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Email</dt>
                      <dd className="mt-1 flex items-center gap-1.5 text-gray-900">
                        <Mail className="h-4 w-4 text-purple-600" />
                        <a href={`mailto:${owner.email}`} className="hover:text-purple-700 hover:underline">
                          {owner.email}
                        </a>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Phone</dt>
                      <dd className="mt-1 flex items-center gap-1.5 text-gray-900">
                        <Phone className="h-4 w-4 text-purple-600" />
                        {owner.phone || "Not provided"}
                      </dd>
                    </div>
                  </dl>
                )}
              </AdminCard>
            </AdminSection>

            <AdminSection
              title="Assigned vehicles"
              description="Revenue share per vehicle"
              actions={
                <Link
                  href="/admin/owners"
                  className="text-sm font-medium text-purple-600 hover:text-purple-800"
                >
                  Edit assignments
                </Link>
              }
            >
              {owner.vehicles.length === 0 ? (
                <AdminCard>
                  <p className="py-6 text-center text-sm text-gray-500">No vehicles assigned yet.</p>
                </AdminCard>
              ) : (
                <AdminTableWrap>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                        <th className="px-4 py-3 font-semibold">Vehicle</th>
                        <th className="px-4 py-3 font-semibold">Owner %</th>
                        <th className="px-4 py-3 font-semibold">Daily rate</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {owner.vehicles.map((v) => (
                        <tr key={v.id} className="border-b border-gray-100">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {getVehicleDisplayName(v)}
                          </td>
                          <td className="px-4 py-3 tabular-nums text-gray-700">{v.ownerPercentage}%</td>
                          <td className="px-4 py-3 tabular-nums text-gray-700">
                            {formatCurrency(v.dailyRate)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/admin/vehicles/${v.id}`}
                              className="inline-flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-800"
                            >
                              View <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </AdminTableWrap>
              )}
            </AdminSection>

            <AdminSection
              title="Recent bookings"
              description="Website reservations and Turo trips on this owner's vehicles. Only website bookings can be managed via payouts."
            >
              {owner.recentBookings.length === 0 ? (
                <AdminCard>
                  <p className="py-6 text-center text-sm text-gray-500">No bookings yet.</p>
                </AdminCard>
              ) : (
                <div className="space-y-2">
                  {owner.recentBookings.map((b) => {
                    const isTuro = isOwnerTuroBooking(b);
                    return (
                    <div
                      key={b.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-medium text-gray-900">{b.vehicleName}</p>
                          {isTuro ? (
                            <Badge className="border-teal-200 bg-teal-100 text-teal-800">Turo</Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-gray-500">
                          {formatDate(b.pickupDate)} → {formatDate(b.returnDate)} · {b.customerName}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <OwnerStatusBadge status={b.status} />
                        {!isTuro ? <PayoutStatusBadge status={b.payoutStatus} /> : null}
                        <span className="font-semibold tabular-nums text-gray-900">
                          {formatCurrency(b.ownerPayout)}
                        </span>
                        {!isTuro ? (
                        <Link
                          href={`/admin/bookings?highlight=${encodeURIComponent(b.id)}`}
                          className="inline-flex items-center gap-0.5 text-sm text-purple-600 hover:text-purple-800"
                        >
                          Booking <ChevronRight className="h-4 w-4" />
                        </Link>
                        ) : null}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </AdminSection>
          </>
        )}
      </AdminPageBody>

      <ManagePayoutsModal
        owner={payoutsOpen && owner ? { id: owner.id, name: owner.name } : null}
        onClose={() => setPayoutsOpen(false)}
        onChanged={load}
      />
    </>
  );
}
