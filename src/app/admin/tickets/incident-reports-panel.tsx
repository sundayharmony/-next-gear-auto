"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, Plus, RefreshCw } from "lucide-react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { useAutoToast } from "@/lib/hooks/useAutoToast";
import type { BookingDbRow, VehicleListItem } from "@/lib/types";
import { AdminPageBody, AdminPageHeader, AdminCard } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/date-helpers";
import { logger } from "@/lib/utils/logger";
import { TripAssociationSelect, type TuroTripOption } from "@/components/admin/trip-association-select";
import type { TripAssociation } from "@/lib/documents/trip-association";
import {
  DocumentLineItemsEditor,
  draftsFromLineItems,
  draftsToLineItems,
  emptyDocumentLineDraft,
  type DocumentLineItemDraft,
} from "@/components/admin/document-line-items-editor";
import type { DocumentLineItem } from "@/lib/documents/document-line-items";
import { sumDocumentLineItems } from "@/lib/documents/document-line-items";
import type { StaffPanelConfig } from "@/lib/admin/staff-panel-config";
import { RecordsHubTabs } from "./records-hub-tabs";

export type IncidentRecord = {
  id: string;
  bookingId: string | null;
  blockedDateId: string | null;
  vehicleId: string | null;
  title: string;
  description: string;
  occurredAt: string;
  status: string;
  lineItems: DocumentLineItem[];
  notes: string;
  createdAt: string;
  vehicleName: string;
  customerName: string;
  bookingDates: string;
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  in_review: "bg-amber-100 text-amber-800",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

export function IncidentReportsPanel({ panelConfig }: { panelConfig: StaffPanelConfig }) {
  const panelBase = panelConfig.panelBase;
  const { error, setError, success, setSuccess } = useAutoToast();
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [bookings, setBookings] = useState<BookingDbRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [turoTrips, setTuroTrips] = useState<TuroTripOption[]>([]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("open");
  const [notes, setNotes] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [trip, setTrip] = useState<TripAssociation>({ bookingId: null, blockedDateId: null });
  const [lineDrafts, setLineDrafts] = useState<DocumentLineItemDraft[]>([emptyDocumentLineDraft()]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [incRes, bookRes, vehRes, blockRes] = await Promise.all([
        adminFetch("/api/admin/incident-reports"),
        adminFetch("/api/admin/bookings"),
        adminFetch("/api/admin/vehicles"),
        adminFetch("/api/admin/blocked-dates?scope=visible"),
      ]);
      const incJson = await incRes.json();
      if (incRes.ok && incJson.success) setIncidents(incJson.data || []);
      else setError(incJson.message || "Failed to load incident reports");

      if (bookRes.ok) {
        const b = await bookRes.json();
        setBookings(b.data || []);
      }
      if (vehRes.ok) {
        const v = await vehRes.json();
        setVehicles(v.data || []);
      }
      if (blockRes.ok) {
        const bd = await blockRes.json();
        const rows = (bd.data || []) as {
          id: string;
          start_date: string;
          end_date: string;
          source?: string;
          reason?: string;
          location?: string;
        }[];
        setTuroTrips(
          rows
            .filter((r) => r.source === "turo-email")
            .slice(0, 200)
            .map((r) => ({
              id: r.id,
              label: `Turo — ${r.reason || r.location || "Trip"} (${r.start_date})`,
            }))
        );
      }
    } catch (err) {
      logger.error("Incident reports load failed", err);
      setError("Failed to load incident reports");
    } finally {
      setLoading(false);
    }
  }, [setError]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setOccurredAt(new Date().toISOString().split("T")[0]);
    setStatus("open");
    setNotes("");
    setVehicleId("");
    setTrip({ bookingId: null, blockedDateId: null });
    setLineDrafts([emptyDocumentLineDraft()]);
  };

  const handleCreate = async () => {
    if (!title.trim() || !occurredAt) {
      setError("Title and date are required");
      return;
    }
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/incident-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          occurredAt,
          status,
          notes,
          vehicleId: vehicleId || null,
          bookingId: trip.bookingId,
          blockedDateId: trip.blockedDateId,
          lineItems: draftsToLineItems(lineDrafts),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Failed to create incident report");
        return;
      }
      setSuccess("Incident report created");
      setAdding(false);
      resetForm();
      await load();
    } catch {
      setError("Failed to create incident report");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Tickets & billing"
        subtitle="Incident reports for damage, accidents, and trip issues"
      >
        <RecordsHubTabs panelBase={panelBase} className="mt-4" />
      </AdminPageHeader>
      <AdminPageBody>
        <div className="flex flex-wrap gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setAdding(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            New incident report
          </Button>
        </div>

        {adding && (
          <AdminCard className="mb-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">New incident report</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500 block mb-1">Title *</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Front bumper damage" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500 block mb-1">Occurred *</label>
                <DatePicker value={occurredAt} onChange={setOccurredAt} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500 block mb-1">Status</label>
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="open">Open</option>
                  <option value="in_review">In review</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500 block mb-1">Vehicle</label>
                <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.year} {v.make} {v.model}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold uppercase text-gray-500 block mb-1">Associated trip</label>
                <TripAssociationSelect
                  value={trip}
                  onChange={(next) => {
                    setTrip(next);
                    if (next.bookingId) {
                      const b = bookings.find((x) => x.id === next.bookingId);
                      if (b?.vehicle_id) setVehicleId(b.vehicle_id);
                    }
                  }}
                  bookings={bookings}
                  turoTrips={turoTrips}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500 block mb-1">Description</label>
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <DocumentLineItemsEditor drafts={lineDrafts} onChange={setLineDrafts} />
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500 block mb-1">Internal notes</label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => void handleCreate()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save report
              </Button>
              <Button variant="outline" onClick={() => { setAdding(false); resetForm(); }}>
                Cancel
              </Button>
            </div>
          </AdminCard>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : incidents.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-12">No incident reports yet.</p>
        ) : (
          <div className="space-y-3">
            {incidents.map((inc) => (
              <AdminCard key={inc.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <h3 className="font-semibold text-gray-900">{inc.title}</h3>
                      <Badge className={STATUS_COLORS[inc.status] || STATUS_COLORS.open}>{inc.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{inc.description || "No description"}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatDate(inc.occurredAt)}
                      {inc.customerName ? ` · ${inc.customerName}` : ""}
                      {inc.vehicleName ? ` · ${inc.vehicleName}` : ""}
                      {inc.lineItems.length > 0
                        ? ` · Est. $${sumDocumentLineItems(inc.lineItems).toFixed(2)}`
                        : ""}
                    </p>
                  </div>
                </div>
              </AdminCard>
            ))}
          </div>
        )}
      </AdminPageBody>
    </>
  );
}
