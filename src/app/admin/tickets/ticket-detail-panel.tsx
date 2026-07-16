"use client";

import Link from "next/link";
import type { VehicleListItem, BookingDbRow } from "@/lib/types";
import {
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AdminPageHeader,
  AdminPageBody,
  AdminCard,
} from "@/components/admin/admin-shell";
import { formatDate } from "@/lib/utils/date-helpers";
import { getStaffVehicleDetailsHref } from "@/lib/admin/staff-vehicle-links";
import { STATUS_COLORS, type TicketRecord } from "./tickets-shared";

type Vehicle = VehicleListItem;
type Booking = BookingDbRow;

export interface TicketFormState {
  bookingId: string;
  vehicleId: string;
  licensePlate: string;
  ticketType: string;
  violationDate: string;
  state: string;
  municipality: string;
  courtId: string;
  prefix: string;
  ticketNumber: string;
  amountDue: string;
  status: string;
  notes: string;
}

export interface TicketFormProps {
  form: TicketFormState;
  setForm: React.Dispatch<React.SetStateAction<TicketFormState>>;
  bookings: Booking[];
  vehicles: Vehicle[];
  onBookingSelect: (bookingId: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isEdit: boolean;
  isSubmitting: boolean;
}

export function TicketForm({
  form,
  setForm,
  bookings,
  vehicles,
  onBookingSelect,
  onSubmit,
  onCancel,
  isEdit,
  isSubmitting,
}: TicketFormProps) {
  return (
    <AdminCard className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Type</label>
            <Select
              value={form.ticketType}
              onChange={(e) => setForm((f) => ({ ...f, ticketType: e.target.value }))}
            >
              <option value="traffic">Traffic</option>
              <option value="parking">Parking</option>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Violation Date *</label>
            <DatePicker
              value={form.violationDate}
              onChange={(val) => setForm((f) => ({ ...f, violationDate: val }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Amount Due</label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.amountDue}
              onChange={(e) => setForm((f) => ({ ...f, amountDue: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">State</label>
            <Input
              placeholder="NJ"
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Municipality</label>
            <Input
              placeholder="Jersey City"
              value={form.municipality}
              onChange={(e) => setForm((f) => ({ ...f, municipality: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Court ID</label>
            <Input
              placeholder="e.g. 0906"
              value={form.courtId}
              onChange={(e) => setForm((f) => ({ ...f, courtId: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Prefix</label>
            <Input
              placeholder="e.g. S"
              value={form.prefix}
              onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Ticket Number</label>
            <Input
              placeholder="e.g. 123456"
              value={form.ticketNumber}
              onChange={(e) => setForm((f) => ({ ...f, ticketNumber: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">License Plate</label>
            <Input
              placeholder="e.g. ABC-1234"
              value={form.licensePlate}
              onChange={(e) => setForm((f) => ({ ...f, licensePlate: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Status</label>
            <Select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="disputed">Disputed</option>
              <option value="dismissed">Dismissed</option>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Linked Booking</label>
            <Select
              value={form.bookingId}
              onChange={(e) => onBookingSelect(e.target.value)}
            >
              <option value="">No booking</option>
              {bookings
                .filter((b) => ["confirmed", "active", "completed"].includes(b.status))
                .sort((a, b) => new Date(b.pickup_date + "T00:00:00").getTime() - new Date(a.pickup_date + "T00:00:00").getTime())
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.customer_name} — {b.vehicleName || "Vehicle"} ({b.pickup_date})
                  </option>
                ))}
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Vehicle</label>
            <Select
              value={form.vehicleId}
              onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}
            >
              <option value="">Select vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.year} {v.make} {v.model}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Notes</label>
          <Textarea
            rows={3}
            placeholder="Additional details..."
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEdit ? "Saving..." : "Adding..."}
              </>
            ) : (
              isEdit ? "Save Changes" : "Add Ticket"
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
    </AdminCard>
  );
}

interface TicketDetailViewProps {
  ticket: TicketRecord;
  panelBase: string;
  deleteConfirm: string | null;
  isDeleting: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onDelete: () => void;
}

export function TicketDetailView({
  ticket,
  panelBase,
  deleteConfirm,
  isDeleting,
  onBack,
  onEdit,
  onDeleteConfirm,
  onDeleteCancel,
  onDelete,
}: TicketDetailViewProps) {
  return (
    <>
      <AdminPageHeader
        title={
          ticket.prefix && ticket.ticketNumber
            ? `Ticket ${ticket.prefix}-${ticket.ticketNumber}`
            : `Ticket ${ticket.id.slice(0, 12)}`
        }
        subtitle={ticket.ticketType === "traffic" ? "Traffic Violation" : "Parking Violation"}
        onBack={onBack}
        backLabel="Back to tickets"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="page-hero-btn-outline" onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
            {deleteConfirm === ticket.id ? (
              <div className="flex gap-1">
                <Button size="sm" variant="danger" onClick={onDelete} disabled={isDeleting}>
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Confirm Delete"
                  )}
                </Button>
                <Button size="sm" variant="outline" className="page-hero-btn-outline" onClick={onDeleteCancel} disabled={isDeleting}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="page-hero-btn-outline text-red-200 hover:text-white"
                onClick={onDeleteConfirm}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            )}
          </div>
        }
      />
      <AdminPageBody>
        <div className="bg-gradient-to-br from-gray-900 to-red-900 rounded-xl p-4 sm:p-6 text-white">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            <div>
              <p className="text-gray-300 text-xs font-medium uppercase tracking-wider">Amount Due</p>
              <p className="text-3xl font-bold mt-1">${ticket.amountDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-gray-300 text-xs font-medium uppercase tracking-wider">Status</p>
              <Badge className={`mt-2 text-sm ${STATUS_COLORS[ticket.status]}`}>
                {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
              </Badge>
            </div>
            <div>
              <p className="text-gray-300 text-xs font-medium uppercase tracking-wider">Type</p>
              <p className="text-lg font-bold mt-1 capitalize">{ticket.ticketType}</p>
            </div>
            <div>
              <p className="text-gray-300 text-xs font-medium uppercase tracking-wider">Violation Date</p>
              <p className="text-lg font-bold mt-1">{formatDate(ticket.violationDate)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AdminCard className="space-y-4">
              <h3 className="font-semibold text-gray-900">Ticket Information</h3>
              <div className="space-y-3 text-sm">
                {ticket.state && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">State</span>
                    <span className="font-medium">{ticket.state}</span>
                  </div>
                )}
                {ticket.municipality && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Municipality</span>
                    <span className="font-medium">{ticket.municipality}</span>
                  </div>
                )}
                {ticket.courtId && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Court ID</span>
                    <span className="font-medium">{ticket.courtId}</span>
                  </div>
                )}
                {ticket.prefix && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Prefix</span>
                    <span className="font-medium">{ticket.prefix}</span>
                  </div>
                )}
                {ticket.ticketNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ticket Number</span>
                    <span className="font-medium font-mono">{ticket.ticketNumber}</span>
                  </div>
                )}
                {ticket.licensePlate && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">License Plate</span>
                    <span className="font-medium font-mono">{ticket.licensePlate}</span>
                  </div>
                )}
              </div>
          </AdminCard>

          <AdminCard className="space-y-4">
              <h3 className="font-semibold text-gray-900">Linked Trip</h3>
              <div className="space-y-3 text-sm">
                {ticket.vehicleName && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Vehicle</span>
                    <span className="font-medium">
                      {ticket.vehicleId ? (
                        <Link
                          href={getStaffVehicleDetailsHref(ticket.vehicleId, panelBase)}
                          className="hover:text-purple-700 hover:underline"
                        >
                          {ticket.vehicleName}
                        </Link>
                      ) : (
                        ticket.vehicleName
                      )}
                    </span>
                  </div>
                )}
                {ticket.customerName && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Driver</span>
                    <span className="font-medium">{ticket.customerName}</span>
                  </div>
                )}
                {ticket.bookingDates && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Trip Dates</span>
                    <span className="font-medium">{ticket.bookingDates}</span>
                  </div>
                )}
                {!ticket.bookingId && (
                  <p className="text-gray-400 text-center py-4">No booking linked</p>
                )}
              </div>
          </AdminCard>
        </div>

        {ticket.notes && (
          <AdminCard>
            <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{ticket.notes}</p>
          </AdminCard>
        )}
      </AdminPageBody>
    </>
  );
}

interface TicketEditPanelProps {
  form: TicketFormState;
  setForm: React.Dispatch<React.SetStateAction<TicketFormState>>;
  bookings: Booking[];
  vehicles: Vehicle[];
  onBookingSelect: (bookingId: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function TicketEditPanel({
  form,
  setForm,
  bookings,
  vehicles,
  onBookingSelect,
  onSubmit,
  onCancel,
  isSubmitting,
}: TicketEditPanelProps) {
  return (
    <>
      <AdminPageHeader title="Edit Ticket" onBack={onCancel} backLabel="Back to tickets" />
      <AdminPageBody>
        <TicketForm
          form={form}
          setForm={setForm}
          bookings={bookings}
          vehicles={vehicles}
          onBookingSelect={onBookingSelect}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isEdit
          isSubmitting={isSubmitting}
        />
      </AdminPageBody>
    </>
  );
}
