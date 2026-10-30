"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Plus, RefreshCw } from "lucide-react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { useAutoToast } from "@/lib/hooks/useAutoToast";
import type { BookingDbRow, VehicleListItem } from "@/lib/types";
import { AdminPageBody, AdminPageHeader } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/date-helpers";
import { logger } from "@/lib/utils/logger";
import { TripAssociationSelect, type TuroTripOption } from "@/components/admin/trip-association-select";
import type { TripAssociation } from "@/lib/documents/trip-association";
import {
  draftsFromLineItems,
  draftsToLineItems,
  emptyDocumentLineDraft,
  type DocumentLineItemDraft,
} from "@/components/admin/document-line-items-editor";
import type { DocumentLineItem } from "@/lib/documents/document-line-items";
import { sumDocumentLineItems } from "@/lib/documents/document-line-items";
import type { StaffPanelConfig } from "@/lib/admin/staff-panel-config";
import { RecordsHubTabs } from "./records-hub-tabs";
import { RecordsHubSubnav } from "./records-hub-subnav";
import { RecordsHubChip, RecordsHubChipGroup, RecordsHubHeroStats, RecordsHubRecordRow } from "./records-hub-list";
import { IncidentDetailView, IncidentFormFields } from "./incident-detail-panel";
import { displayDocumentNumber } from "@/lib/documents/short-document-number";

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

function enrichIncident(
  inc: IncidentRecord,
  bookings: BookingDbRow[],
  vehicles: VehicleListItem[]
): { vehicleLabel: string; customerLabel: string } {
  let vehicleLabel = inc.vehicleName;
  let customerLabel = inc.customerName;
  if (!vehicleLabel && inc.vehicleId) {
    const v = vehicles.find((x) => x.id === inc.vehicleId);
    if (v) vehicleLabel = `${v.year} ${v.make} ${v.model}`;
  }
  if (!customerLabel && inc.bookingId) {
    const b = bookings.find((x) => x.id === inc.bookingId);
    if (b) customerLabel = b.customer_name || b.customer_email || "";
  }
  if (!vehicleLabel && inc.bookingId) {
    const b = bookings.find((x) => x.id === inc.bookingId);
    if (b?.vehicle_id) {
      const v = vehicles.find((x) => x.id === b.vehicle_id);
      if (v) vehicleLabel = `${v.year} ${v.make} ${v.model}`;
    }
  }
  return { vehicleLabel, customerLabel };
}

export function IncidentReportsPanel({ panelConfig }: { panelConfig: StaffPanelConfig }) {
  const panelBase = panelConfig.panelBase;
  const bookingsHref = `${panelBase}/bookings`;
  const { error, setError, success, setSuccess } = useAutoToast();
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [bookings, setBookings] = useState<BookingDbRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [turoTrips, setTuroTrips] = useState<TuroTripOption[]>([]);
  const [adding, setAdding] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "in_review" | "resolved" | "closed">("all");
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("open");
  const [notes, setNotes] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [trip, setTrip] = useState<TripAssociation>({ bookingId: null, blockedDateId: null });
  const [lineDrafts, setLineDrafts] = useState<DocumentLineItemDraft[]>([emptyDocumentLineDraft()]);

  const selectedIncident = useMemo(
    () => incidents.find((i) => i.id === selectedId) ?? null,
    [incidents, selectedId]
  );

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

  const populateFormFromIncident = (inc: IncidentRecord) => {
    setTitle(inc.title);
    setDescription(inc.description);
    setOccurredAt(inc.occurredAt);
    setStatus(inc.status);
    setNotes(inc.notes);
    setVehicleId(inc.vehicleId || "");
    setTrip({ bookingId: inc.bookingId, blockedDateId: inc.blockedDateId });
    setLineDrafts(draftsFromLineItems(inc.lineItems));
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

  const handleUpdate = async () => {
    if (!selectedIncident || !title.trim() || !occurredAt) {
      setError("Title and date are required");
      return;
    }
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/incident-reports", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedIncident.id,
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
        setError(json.message || "Failed to update incident report");
        return;
      }
      setSuccess("Incident report updated");
      setEditMode(false);
      await load();
    } catch {
      setError("Failed to update incident report");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedIncident) return;
    setIsDeleting(true);
    try {
      const res = await adminFetch(`/api/admin/incident-reports?id=${encodeURIComponent(selectedIncident.id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Failed to delete incident report");
        return;
      }
      setSuccess("Incident report deleted");
      setSelectedId(null);
      setDeleteConfirm(false);
      await load();
    } catch {
      setError("Failed to delete incident report");
    } finally {
      setIsDeleting(false);
    }
  };

  if (selectedIncident && !editMode) {
    const { vehicleLabel, customerLabel } = enrichIncident(selectedIncident, bookings, vehicles);
    return (
      <IncidentDetailView
        incident={selectedIncident}
        panelBase={panelBase}
        bookingsHref={bookingsHref}
        vehicleLabel={vehicleLabel}
        customerLabel={customerLabel}
        deleteConfirm={deleteConfirm}
        isDeleting={isDeleting}
        onBack={() => {
          setSelectedId(null);
          setDeleteConfirm(false);
        }}
        onEdit={() => {
          populateFormFromIncident(selectedIncident);
          setEditMode(true);
        }}
        onDeleteConfirm={() => setDeleteConfirm(true)}
        onDeleteCancel={() => setDeleteConfirm(false)}
        onDelete={() => void handleDelete()}
      />
    );
  }

  if (selectedIncident && editMode) {
    return (
      <>
        <AdminPageHeader title="Tickets & billing" subtitle="Edit incident report">
          <RecordsHubTabs panelBase={panelBase} className="mt-4" />
        </AdminPageHeader>
        <AdminPageBody>
          <RecordsHubSubnav panelBase={panelBase} />
          <IncidentFormFields
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            occurredAt={occurredAt}
            setOccurredAt={setOccurredAt}
            status={status}
            setStatus={setStatus}
            notes={notes}
            setNotes={setNotes}
            vehicleId={vehicleId}
            setVehicleId={setVehicleId}
            trip={trip}
            onTripChange={setTrip}
            lineDrafts={lineDrafts}
            onLineDraftsChange={setLineDrafts}
            bookings={bookings}
            vehicles={vehicles}
            turoTrips={turoTrips}
            onSubmit={() => void handleUpdate()}
            onCancel={() => {
              setEditMode(false);
              resetForm();
            }}
            submitLabel="Save changes"
            saving={saving}
          />
        </AdminPageBody>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Tickets & billing"
        subtitle="Incident reports for damage, accidents, and trip issues"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void load()} className="page-hero-btn-outline">
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" className="bg-white text-purple-900 hover:bg-purple-50" onClick={() => { resetForm(); setAdding(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              New incident report
            </Button>
          </>
        }
      >
        <RecordsHubTabs panelBase={panelBase} className="mt-4" />
        <RecordsHubHeroStats
          stats={[
            { value: incidents.length, label: "Total Reports" },
            { value: incidents.filter((i) => i.status === "open").length, label: "Open", valueClassName: "text-red-300" },
            { value: incidents.filter((i) => i.status === "in_review").length, label: "In Review" },
            {
              value: `$${incidents.reduce((sum, i) => sum + sumDocumentLineItems(i.lineItems), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
              label: "Estimated Amount",
            },
          ]}
        />
      </AdminPageHeader>
      <AdminPageBody>
        <RecordsHubSubnav panelBase={panelBase} />

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}
        {success && (
          <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{success}</p>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          <RecordsHubChipGroup>
            {(["all", "open", "in_review", "resolved", "closed"] as const).map((s) => (
              <RecordsHubChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
                {s.replace("_", " ")} ({s === "all" ? incidents.length : incidents.filter((i) => i.status === s).length})
              </RecordsHubChip>
            ))}
          </RecordsHubChipGroup>
        </div>

        {adding && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">New incident report</h2>
            <IncidentFormFields
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              occurredAt={occurredAt}
              setOccurredAt={setOccurredAt}
              status={status}
              setStatus={setStatus}
              notes={notes}
              setNotes={setNotes}
              vehicleId={vehicleId}
              setVehicleId={setVehicleId}
              trip={trip}
              onTripChange={setTrip}
              lineDrafts={lineDrafts}
              onLineDraftsChange={setLineDrafts}
              bookings={bookings}
              vehicles={vehicles}
              turoTrips={turoTrips}
              onSubmit={() => void handleCreate()}
              onCancel={() => { setAdding(false); resetForm(); }}
              submitLabel="Save report"
              saving={saving}
            />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : incidents.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-12">No incident reports yet.</p>
        ) : (
          <div className="space-y-2">
            {incidents.filter((inc) => statusFilter === "all" || inc.status === statusFilter).length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-12">No incident reports match this filter.</p>
            ) : null}
            {incidents
              .filter((inc) => statusFilter === "all" || inc.status === statusFilter)
              .map((inc) => {
              const { vehicleLabel, customerLabel } = enrichIncident(inc, bookings, vehicles);
              const estimate = sumDocumentLineItems(inc.lineItems);
              return (
                <RecordsHubRecordRow
                  key={inc.id}
                  onClick={() => setSelectedId(inc.id)}
                  icon={<AlertTriangle className="h-5 w-5" />}
                  iconClassName="bg-amber-100 text-amber-600"
                  title={inc.title}
                  badges={
                    <>
                      <Badge className="text-xs bg-purple-100 text-purple-700">#{displayDocumentNumber(inc.id)}</Badge>
                      <Badge className={`text-xs border ${STATUS_COLORS[inc.status] || STATUS_COLORS.open}`}>
                        {inc.status.replace("_", " ")}
                      </Badge>
                    </>
                  }
                  meta={
                    <>
                      <span>{formatDate(inc.occurredAt)}</span>
                      {customerLabel ? <span>{customerLabel}</span> : null}
                      {vehicleLabel ? <span>{vehicleLabel}</span> : null}
                    </>
                  }
                  trailing={
                    estimate > 0 ? (
                      <p className="text-lg font-bold text-gray-900">${estimate.toFixed(2)}</p>
                    ) : null
                  }
                />
              );
            })}
          </div>
        )}
      </AdminPageBody>
    </>
  );
}
