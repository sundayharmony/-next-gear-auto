"use client";

import Link from "next/link";
import { ArrowLeft, Loader2, Pencil, Trash2 } from "lucide-react";
import type { BookingDbRow, VehicleListItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import {
  AdminPageBody,
  AdminPageHeader,
  AdminCard,
} from "@/components/admin/admin-shell";
import { formatDate } from "@/lib/utils/date-helpers";
import { TripAssociationSelect, type TuroTripOption } from "@/components/admin/trip-association-select";
import type { TripAssociation } from "@/lib/documents/trip-association";
import {
  DocumentLineItemsEditor,
  type DocumentLineItemDraft,
} from "@/components/admin/document-line-items-editor";
import { sumDocumentLineItems } from "@/lib/documents/document-line-items";
import { RecordsHubTabs } from "./records-hub-tabs";
import { RecordsHubSubnav } from "./records-hub-subnav";
import { DocumentPdfActions } from "@/components/admin/document-pdf-actions";
import type { IncidentRecord } from "./incident-reports-panel";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  in_review: "bg-amber-100 text-amber-800",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

type IncidentFormProps = {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  occurredAt: string;
  setOccurredAt: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  vehicleId: string;
  setVehicleId: (v: string) => void;
  trip: TripAssociation;
  onTripChange: (trip: TripAssociation) => void;
  lineDrafts: DocumentLineItemDraft[];
  onLineDraftsChange: (drafts: DocumentLineItemDraft[]) => void;
  bookings: BookingDbRow[];
  vehicles: VehicleListItem[];
  turoTrips: TuroTripOption[];
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  saving: boolean;
};

export function IncidentFormFields(props: IncidentFormProps) {
  const {
    title,
    setTitle,
    description,
    setDescription,
    occurredAt,
    setOccurredAt,
    status,
    setStatus,
    notes,
    setNotes,
    vehicleId,
    setVehicleId,
    trip,
    onTripChange,
    lineDrafts,
    onLineDraftsChange,
    bookings,
    vehicles,
    turoTrips,
    onSubmit,
    onCancel,
    submitLabel,
    saving,
  } = props;

  return (
    <AdminCard className="space-y-4">
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
              onTripChange(next);
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
      <DocumentLineItemsEditor drafts={lineDrafts} onChange={onLineDraftsChange} />
      <div>
        <label className="text-xs font-semibold uppercase text-gray-500 block mb-1">Internal notes</label>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onSubmit} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {submitLabel}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </AdminCard>
  );
}

export function IncidentDetailView({
  incident,
  panelBase,
  bookingsHref,
  vehicleLabel,
  customerLabel,
  deleteConfirm,
  isDeleting,
  onBack,
  onEdit,
  onDeleteConfirm,
  onDeleteCancel,
  onDelete,
}: {
  incident: IncidentRecord;
  panelBase: string;
  bookingsHref: string;
  vehicleLabel: string;
  customerLabel: string;
  deleteConfirm: boolean;
  isDeleting: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onDelete: () => void;
}) {
  const lineTotal = sumDocumentLineItems(incident.lineItems);

  return (
    <>
      <AdminPageHeader title="Tickets & billing" subtitle={incident.title}>
        <RecordsHubTabs panelBase={panelBase} className="mt-4" />
      </AdminPageHeader>
      <AdminPageBody>
        <RecordsHubSubnav panelBase={panelBase} />
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <DocumentPdfActions
            previewUrl={`/api/admin/incident-reports/pdf?id=${encodeURIComponent(incident.id)}`}
            downloadUrl={`/api/admin/incident-reports/pdf?id=${encodeURIComponent(incident.id)}`}
            downloadFilename={`incident-${incident.id}`}
          />
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to list
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
          {deleteConfirm ? (
            <>
              <Button variant="danger" size="sm" onClick={onDelete} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Confirm delete
              </Button>
              <Button variant="outline" size="sm" onClick={onDeleteCancel}>Cancel</Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={onDeleteConfirm} className="text-red-600 border-red-200">
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
        </div>

        <AdminCard className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{incident.title}</h2>
            <Badge className={STATUS_COLORS[incident.status] || STATUS_COLORS.open}>{incident.status}</Badge>
          </div>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{incident.description || "No description"}</p>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Occurred</dt>
              <dd className="font-medium text-gray-900">{formatDate(incident.occurredAt)}</dd>
            </div>
            {vehicleLabel ? (
              <div>
                <dt className="text-gray-500">Vehicle</dt>
                <dd className="font-medium text-gray-900">{vehicleLabel}</dd>
              </div>
            ) : null}
            {customerLabel ? (
              <div>
                <dt className="text-gray-500">Customer</dt>
                <dd className="font-medium text-gray-900">{customerLabel}</dd>
              </div>
            ) : null}
            {incident.bookingId ? (
              <div>
                <dt className="text-gray-500">Booking</dt>
                <dd>
                  <Link
                    href={`${bookingsHref}?highlight=${incident.bookingId}`}
                    className="text-purple-600 hover:underline font-mono text-xs"
                  >
                    {incident.bookingId}
                  </Link>
                </dd>
              </div>
            ) : null}
          </dl>

          {incident.lineItems.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Line items</p>
              <div className="hidden lg:block overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase border-b">
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2 text-right">Rate</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incident.lineItems.map((line, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium">{line.title}</td>
                        <td className="px-3 py-2 text-gray-600">{line.description || "—"}</td>
                        <td className="px-3 py-2 text-right">${line.unitPrice.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{line.quantity}</td>
                        <td className="px-3 py-2 text-right font-medium">
                          ${(line.unitPrice * line.quantity).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="lg:hidden space-y-2 text-sm">
                {incident.lineItems.map((line, i) => (
                  <li key={i} className="rounded border border-gray-200 p-2">
                    <p className="font-medium">{line.title}</p>
                    {line.description ? <p className="text-gray-600">{line.description}</p> : null}
                    <p className="text-gray-700 mt-1">
                      ${line.unitPrice.toFixed(2)} × {line.quantity}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="text-sm font-semibold text-gray-900 mt-2 text-right">Total: ${lineTotal.toFixed(2)}</p>
            </div>
          ) : null}

          {incident.notes ? (
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Internal notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{incident.notes}</p>
            </div>
          ) : null}
        </AdminCard>
      </AdminPageBody>
    </>
  );
}
