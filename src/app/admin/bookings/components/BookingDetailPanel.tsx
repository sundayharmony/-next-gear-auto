"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Pencil,
  Save,
  Mail,
  RefreshCw,
  Upload,
  User,
  UserPlus,
  Shield,
  Check,
  ChevronDown,
  ChevronUp,
  Ticket,
  Link2,
  Copy,
  CreditCard,
  Clock,
  FileText,
  AlertTriangle,
  StickyNote,
  DollarSign,
  Plus,
  Calculator,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookingRow,
  Vehicle,
  ExtraItem,
  ActivityRecord,
  PaymentRecord,
  TicketRecord,
  STATUS_STEPS,
  PAYMENT_METHODS,
  TIME_SLOTS,
  AVAILABLE_EXTRAS,
} from "../types";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { formatDate, formatTime } from "@/lib/utils/date-helpers";
import { statusColors } from "@/lib/utils/status-colors";
import { calculateRentalDays, calculatePricing } from "@/lib/utils/price-calculator";
import { logger } from "@/lib/utils/logger";
import { Location } from "@/lib/types";

interface BookingDetailPanelProps {
  booking: BookingRow;
  vehicles: Vehicle[];
  onClose: () => void;
  onUpdateBooking: (updated: BookingRow) => void;
  onUpdateStatus: (bookingId: string, newStatus: string) => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export function BookingDetailPanel(props: BookingDetailPanelProps) {
  const {
    booking,
    vehicles,
    onClose,
    onUpdateBooking,
    onUpdateStatus,
    onError,
    onSuccess,
  } = props;

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<BookingRow>>(booking);
  const [saving, setSaving] = useState(false);

  // Fetched data
  const [bookingTickets, setBookingTickets] = useState<TicketRecord[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [locations, setLocationsState] = useState<Location[]>([]);

  // Email sending
  const [sendingEmail, setSendingEmail] = useState(false);

  // UI toggles
  const [showNotes, setShowNotes] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "stripe",
    note: "",
  });

  const notesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Cleanup timeout on unmount and handle Escape key
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
      // Clear any pending notes auto-save timeout
      if (notesTimeoutRef.current) {
        clearTimeout(notesTimeoutRef.current);
        notesTimeoutRef.current = null;
      }
    };
  }, [onClose]);

  // Fetch tickets, activity, and payments on mount (in parallel)
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const results = await Promise.allSettled([
          adminFetch(`/api/admin/tickets?booking_id=${booking.id}`),
          adminFetch(`/api/admin/booking-activity?booking_id=${booking.id}`),
          adminFetch(`/api/admin/booking-payments?booking_id=${booking.id}`),
        ]);

        // Handle tickets result
        if (results[0].status === "fulfilled" && results[0].value.ok) {
          const ticketsData = await results[0].value.json();
          setBookingTickets(Array.isArray(ticketsData) ? ticketsData : []);
        }

        // Handle activity result
        if (results[1].status === "fulfilled" && results[1].value.ok) {
          const activityResult = await results[1].value.json();
          const activityItems = activityResult.data ?? activityResult;
          setActivityLog(Array.isArray(activityItems) ? activityItems : []);
        }

        // Handle payments result
        if (results[2].status === "fulfilled" && results[2].value.ok) {
          const paymentsResult = await results[2].value.json();
          const paymentItems = paymentsResult.data ?? paymentsResult;
          setPayments(Array.isArray(paymentItems) ? paymentItems : []);
        }
      } catch (err) {
        logger.error("Failed to fetch booking details", err);
      }
    };

    fetchDetails();
  }, [booking.id]);

  // Fetch locations
  useEffect(() => {
    adminFetch("/api/admin/locations?active=true")
      .then(r => r.json())
      .then(data => {
        if (data.success) setLocationsState(data.data);
      })
      .catch(() => {});
  }, []);

  // Calculate current status index
  const currentStatusIndex = STATUS_STEPS.indexOf(
    booking.status as typeof STATUS_STEPS[number]
  );

  // Sync editData when booking prop changes from parent (e.g., status update)
  useEffect(() => {
    if (!editMode) {
      setEditData(booking);
    }
  }, [booking, editMode]);

  // Handle edit mode toggle
  const toggleEditMode = () => {
    if (!editMode) {
      setEditData(booking);
    }
    setEditMode(!editMode);
  };

  // Handle status step click
  const handleStatusStepClick = (stepIndex: number) => {
    if (stepIndex <= currentStatusIndex || booking.status === "cancelled") {
      return; // Can't go backward or change cancelled
    }

    const newStatus = STATUS_STEPS[stepIndex];

    // Block confirming if the rental agreement hasn't been signed
    if (newStatus === "confirmed" && !booking.agreement_signed_at) {
      onError("Cannot confirm — the customer has not signed the rental agreement yet.");
      return;
    }

    if (window.confirm(`Move booking to "${newStatus}"?`)) {
      updateStatus(newStatus);
    }
  };

  // Update booking status
  const updateStatus = async (newStatus: string) => {
    try {
      const response = await adminFetch(`/api/bookings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      const updated = await response.json();
      onUpdateStatus(booking.id, newStatus);

      // Log the status change
      await adminFetch(`/api/admin/booking-activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: booking.id,
          action: "status_changed",
          details: { from: booking.status, to: newStatus },
        }),
      });

      // Refresh activity log
      const activityRes = await adminFetch(
        `/api/admin/booking-activity?booking_id=${booking.id}`
      );
      if (activityRes.ok) {
        const activityResult = await activityRes.json();
        const activityItems = activityResult.data ?? activityResult;
        setActivityLog(Array.isArray(activityItems) ? activityItems : []);
      }

      onSuccess(`Booking moved to ${newStatus}`);
    } catch (err) {
      logger.error("Status update failed", err);
      onError("Failed to update status");
    }
  };

  // Send email to customer
  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      const res = await adminFetch("/api/admin/send-booking-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess("Email sent to " + (booking.customer_email || "customer"));
      } else {
        onError(data.message || data.error || "Failed to send email");
      }
    } catch (err) {
      logger.error("Failed to send booking email:", err);
      onError("Network error — could not send email");
    } finally {
      setSendingEmail(false);
    }
  };

  // Save edited booking
  const handleSaveChanges = async () => {
    // Validate required fields
    if (!editData.pickup_date) {
      onError("Pickup date is required");
      return;
    }
    if (!editData.return_date) {
      onError("Return date is required");
      return;
    }
    if (!editData.vehicle_id) {
      onError("Vehicle is required");
      return;
    }
    if (editData.return_date < editData.pickup_date) {
      onError("Return date must be after pickup date");
      return;
    }

    setSaving(true);
    try {
      const response = await adminFetch(`/api/bookings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editData, bookingId: booking.id }),
      });

      if (!response.ok) throw new Error("Failed to save booking");

      const result = await response.json();
      // The PATCH endpoint returns { success, data: updatedBooking }
      // Merge server data with existing booking to ensure all fields are present
      const updatedBooking = result.data
        ? { ...booking, ...result.data }
        : { ...booking, ...editData };
      onUpdateBooking(updatedBooking);
      setEditData(updatedBooking);
      setEditMode(false);
      onSuccess("Booking updated successfully");
    } catch (err) {
      logger.error("Save failed", err);
      onError("Failed to save booking");
    } finally {
      setSaving(false);
    }
  };

  // Auto-save notes on blur
  const saveNotes = async () => {
    if (!editData.admin_notes || editData.admin_notes === booking.admin_notes) {
      return;
    }

    setNoteSaving(true);
    try {
      const response = await adminFetch(`/api/bookings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, admin_notes: editData.admin_notes }),
      });

      if (!response.ok) throw new Error("Failed to save notes");

      const result = await response.json();
      const updatedBooking = result.data
        ? { ...booking, ...result.data }
        : { ...booking, admin_notes: editData.admin_notes };
      onUpdateBooking(updatedBooking);

      // Keep "saving" indicator visible briefly so user sees feedback
      notesTimeoutRef.current = setTimeout(() => {
        setNoteSaving(false);
      }, 1500);
    } catch (err) {
      setNoteSaving(false);
      logger.error("Failed to save notes", err);
      onError("Failed to save notes");
    }
  };

  const handleNotesBlur = () => {
    if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
    notesTimeoutRef.current = setTimeout(saveNotes, 500);
  };

  // Record a payment
  const handleRecordPayment = async () => {
    const parsedAmount = parseFloat(paymentForm.amount);
    if (!paymentForm.amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      onError("Please enter a valid amount");
      return;
    }

    setSaving(true);
    try {
      const response = await adminFetch(`/api/admin/booking-payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: booking.id,
          amount: parsedAmount,
          method: paymentForm.method,
          note: paymentForm.note,
        }),
      });

      if (!response.ok) throw new Error("Failed to record payment");

      const newPaymentResult = await response.json();
      const newPaymentRecord = newPaymentResult.data ?? newPaymentResult;
      setPayments([...payments, newPaymentRecord]);

      // Update deposit locally
      const newDeposit = (booking.deposit ?? 0) + parsedAmount;
      const updated = { ...booking, deposit: newDeposit };
      onUpdateBooking(updated);

      setPaymentForm({ amount: "", method: "stripe", note: "" });
      setShowRecordPayment(false);
      onSuccess("Payment recorded successfully");
    } catch (err) {
      logger.error("Failed to record payment", err);
      onError("Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  // Handle document upload (ID or insurance proof) via /api/bookings/upload
  const handleDocumentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: "id_document" | "insurance_proof"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bookingId", booking.id);
      formData.append("type", docType);

      const response = await adminFetch(`/api/bookings/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Upload failed");
      }

      const result = await response.json();

      // Update the booking locally with the new URL
      const fieldName = docType === "id_document" ? "id_document_url" : "insurance_proof_url";
      const updated = { ...booking, [fieldName]: result.url };
      onUpdateBooking(updated);
      onSuccess(`${docType === "id_document" ? "ID document" : "Insurance proof"} uploaded`);
    } catch (err) {
      logger.error(`${docType} upload failed`, err);
      onError(`Failed to upload ${docType === "id_document" ? "ID document" : "insurance proof"}`);
    } finally {
      setSaving(false);
    }
  };

  // Copy booking to clipboard as JSON
  const handleDuplicateBooking = () => {
    const duplicateData = {
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      customer_phone: booking.customer_phone,
      vehicle_id: booking.vehicle_id,
      pickup_date: booking.pickup_date,
      return_date: booking.return_date,
      pickup_time: booking.pickup_time,
      return_time: booking.return_time,
      extras: booking.extras,
    };
    navigator.clipboard.writeText(JSON.stringify(duplicateData, null, 2));
    onSuccess("Booking data copied to clipboard");
  };

  // Calculate balance due
  const balanceDue = Math.max(0, (booking.total_price ?? 0) - (booking.deposit ?? 0));

  // Get vehicle name
  const vehicleObj = vehicles.find((v) => v.id === booking.vehicle_id);
  const vehicleLabel = vehicleObj
    ? `${vehicleObj.year} ${vehicleObj.make} ${vehicleObj.model}`
    : booking.vehicleName;

  // Get payment method label
  const methodLabel =
    PAYMENT_METHODS.find((m) => m.value === (editData.payment_method || booking.payment_method))?.label ||
    booking.payment_method ||
    "Not specified";

  const paymentPercentage = (booking.total_price ?? 0) > 0
    ? Math.round(((booking.deposit ?? 0) / booking.total_price) * 100)
    : 0;

  // Recalculate price from vehicle rate, dates, and extras
  const handleRecalculatePrice = () => {
    const vId = editData.vehicle_id || booking.vehicle_id;
    const v = vehicles.find((ve) => ve.id === vId);
    if (!v) {
      onError("Select a vehicle to recalculate price");
      return;
    }
    const pickup = editData.pickup_date || booking.pickup_date;
    const returnD = editData.return_date || booking.return_date;
    if (!pickup || !returnD) {
      onError("Set pickup and return dates to recalculate");
      return;
    }
    const days = calculateRentalDays(pickup, returnD);
    // Map booking extras to full extras with pricing from AVAILABLE_EXTRAS
    const bookingExtras = (editData.extras ?? booking.extras ?? []) as { id: string; selected?: boolean }[];
    const mappedExtras = AVAILABLE_EXTRAS.map((ae) => {
      const match = bookingExtras.find((be) => be.id === ae.id);
      return { ...ae, selected: match?.selected ?? false };
    });
    const pricing = calculatePricing(days, v.dailyRate, mappedExtras);
    setEditData((prev) => ({
      ...prev,
      total_price: pricing.total,
      deposit: pricing.total,
    }));
    onSuccess(`Recalculated: ${days} day${days > 1 ? "s" : ""} × $${v.dailyRate}/day = $${pricing.total.toFixed(2)}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden">
      {/* Dark backdrop */}
      <div
        className="flex-1 bg-black/50 cursor-pointer"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div ref={panelRef} tabIndex={0} autoFocus className="w-full max-w-lg bg-white shadow-xl overflow-y-auto flex flex-col outline-none">
        {/* Sticky Header */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {editMode ? "Edit Booking" : "Booking Details"}
            </h2>
            <div className="flex items-center gap-2">
              {!editMode && !["completed", "cancelled"].includes(booking.status) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleEditMode}
                  title="Edit booking"
                  aria-label="Edit booking"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                title="Close"
                aria-label="Close booking details"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Booking ID & Status */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 font-mono mb-1">Booking ID</p>
              <p className="font-mono text-sm">{booking.id}</p>
            </div>
            <div>
              <Badge className={statusColors[booking.status] || ""}>
                {booking.status}
              </Badge>
            </div>
          </div>

          {/* Status Tracker */}
          {booking.status !== "cancelled" && (
            <div className="py-4 border-y border-gray-200">
              <div className="flex items-center justify-between">
                {STATUS_STEPS.map((step, idx) => {
                  const isCompleted = idx < currentStatusIndex;
                  const isCurrent = idx === currentStatusIndex;
                  const isFuture = idx > currentStatusIndex;
                  const isLocked = step === "confirmed" && isFuture && !booking.agreement_signed_at;
                  const isClickable = isFuture && !isLocked;

                  return (
                    <React.Fragment key={step}>
                      <div
                        className={`flex flex-col items-center gap-2 flex-1 ${
                          isClickable ? "cursor-pointer" : isLocked ? "cursor-not-allowed opacity-60" : ""
                        }`}
                        onClick={() =>
                          isClickable ? handleStatusStepClick(idx) : isLocked ? onError("Cannot confirm — the customer has not signed the rental agreement yet.") : undefined
                        }
                        title={isLocked ? "Agreement must be signed before confirming" : undefined}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold transition-colors ${
                            isCompleted
                              ? "bg-green-500"
                              : isCurrent
                              ? "bg-purple-600"
                              : isLocked
                              ? "bg-amber-400"
                              : "bg-gray-300"
                          } ${isClickable ? "hover:opacity-80" : ""}`}
                        >
                          {isCompleted ? (
                            <Check className="w-4 h-4" />
                          ) : isLocked ? (
                            <AlertTriangle className="w-4 h-4" />
                          ) : (
                            <span className="text-xs">{idx + 1}</span>
                          )}
                        </div>
                        <span className="text-xs font-medium capitalize">
                          {isLocked ? "Awaiting signature" : step}
                        </span>
                      </div>

                      {idx < STATUS_STEPS.length - 1 && (
                        <div
                          className={`h-0.5 flex-1 mx-2 ${
                            isCompleted ? "bg-green-500" : "bg-gray-300"
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {/* Duplicate button */}
          <button
            onClick={handleDuplicateBooking}
            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Copy className="w-3 h-3" />
            Duplicate
          </button>

          {/* Customer Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4" />
              Customer
            </h3>
            {editMode ? (
              <div className="space-y-3">
                <Input
                  label="Name"
                  value={editData.customer_name || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditData({ ...editData, customer_name: e.target.value })
                  }
                  placeholder="Customer name"
                />
                <Input
                  label="Email"
                  type="email"
                  value={editData.customer_email || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditData({
                      ...editData,
                      customer_email: e.target.value,
                    })
                  }
                  placeholder="email@example.com"
                />
                <Input
                  label="Phone"
                  value={editData.customer_phone || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditData({
                      ...editData,
                      customer_phone: e.target.value,
                    })
                  }
                  placeholder="(555) 123-4567"
                />
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">{booking.customer_name}</span>
                </p>
                <p className="text-gray-600">{booking.customer_email}</p>
                {booking.customer_phone && (
                  <p className="text-gray-600">{booking.customer_phone}</p>
                )}
                <div className="flex gap-2 pt-2">
                  {booking.customer_id && (
                    <a
                      href={`/admin/customers/${booking.customer_id}`}
                      className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1"
                    >
                      <Link2 className="w-3 h-3" />
                      View Client
                    </a>
                  )}
                  {!booking.customer_id && (
                    <button className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1">
                      <UserPlus className="w-3 h-3" />
                      Add as Customer
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ID Document */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              ID Document
            </h3>
            {booking.id_document_url ? (
              <div className="space-y-2">
                <a
                  href={booking.id_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                >
                  <Link2 className="w-3 h-3" />
                  View Document
                </a>
                <label className="block">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleDocumentUpload(e, "id_document")}
                    disabled={saving}
                    className="hidden"
                  />
                  <span className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    Replace
                  </span>
                </label>
              </div>
            ) : (
              <label className="block">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleDocumentUpload(e, "id_document")}
                  disabled={saving}
                  className="hidden"
                />
                <span className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  Upload Document
                </span>
              </label>
            )}
          </div>

          {/* Vehicle */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Vehicle</h3>
            {editMode ? (
              <select
                value={editData.vehicle_id || ""}
                onChange={(e) =>
                  setEditData({ ...editData, vehicle_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Select vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.year} {v.make} {v.model}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-700">{vehicleLabel}</p>
            )}
          </div>

          {/* Dates & Times */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Rental Period
            </h3>
            {editMode ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      Pickup Date
                    </label>
                    <Input
                      type="date"
                      value={editData.pickup_date || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditData({
                          ...editData,
                          pickup_date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      Pickup Time
                    </label>
                    <select
                      value={editData.pickup_time || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          pickup_time: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Select time</option>
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      Return Date
                    </label>
                    <Input
                      type="date"
                      value={editData.return_date || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditData({
                          ...editData,
                          return_date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      Return Time
                    </label>
                    <select
                      value={editData.return_time || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          return_time: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Select time</option>
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* Location */}
                {locations.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Pickup Location
                      </label>
                      <select
                        value={editData.pickup_location_id || ""}
                        onChange={(e) => setEditData({ ...editData, pickup_location_id: e.target.value || undefined })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="">None</option>
                        {locations.map(l => (
                          <option key={l.id} value={l.id}>{l.name}{l.surcharge > 0 ? ` (+$${l.surcharge.toFixed(2)})` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Dropoff Location
                      </label>
                      <select
                        value={editData.return_location_id || ""}
                        onChange={(e) => setEditData({ ...editData, return_location_id: e.target.value || undefined })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="">Same as pickup</option>
                        {locations.map(l => (
                          <option key={l.id} value={l.id}>{l.name}{l.surcharge > 0 ? ` (+$${l.surcharge.toFixed(2)})` : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Pickup</p>
                    <p className="font-medium">{formatDate(booking.pickup_date)}</p>
                    {booking.pickup_time && (
                      <p className="text-gray-600 text-xs">
                        {formatTime(booking.pickup_time)}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Return</p>
                    <p className="font-medium">{formatDate(booking.return_date)}</p>
                    {booking.return_time && (
                      <p className="text-gray-600 text-xs">
                        {formatTime(booking.return_time)}
                      </p>
                    )}
                  </div>
                </div>
                {(booking.pickup_location_name || booking.return_location_name) && (
                  <div className="flex items-center justify-between py-2">
                    <span className="flex items-center gap-1.5 text-sm text-gray-500">
                      <MapPin className="w-3.5 h-3.5" /> Location
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900">{booking.pickup_location_name || "—"}</span>
                      {booking.return_location_name && booking.return_location_name !== booking.pickup_location_name && (
                        <span className="text-xs text-gray-500 block">Return: {booking.return_location_name}</span>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Extras */}
          {booking.extras && booking.extras.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Extras
              </h3>
              <div className="space-y-2">
                {booking.extras.map((extra) => (
                  <div
                    key={extra.id}
                    className="flex justify-between text-sm border-l-2 border-blue-200 pl-3 py-1"
                  >
                    <span className="text-gray-700">{extra.name}</span>
                    <span className="font-medium">
                      ${extra.pricePerDay}/day
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insurance */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Insurance
            </h3>
            {booking.insurance_opted_out ? (
              <div className="space-y-2">
                <Badge className="bg-yellow-100 text-yellow-700">
                  Opted Out (Own Coverage)
                </Badge>
                {booking.insurance_proof_url ? (
                  <a
                    href={booking.insurance_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                  >
                    <Link2 className="w-3 h-3" />
                    View Proof
                  </a>
                ) : (
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleDocumentUpload(e, "insurance_proof")}
                      disabled={saving}
                      className="hidden"
                    />
                    <span className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      Upload Proof
                    </span>
                  </label>
                )}
              </div>
            ) : (
              <Badge className="bg-green-100 text-green-700">
                NextGearAuto Insurance Included
              </Badge>
            )}
          </div>

          {/* Payment Summary Card */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payment Summary
            </h3>

            {editMode ? (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-700">
                      Total Price
                    </label>
                    <button
                      type="button"
                      onClick={handleRecalculatePrice}
                      title="Recalculate price from vehicle rate, dates & extras"
                      className="p-1 rounded-md text-purple-600 hover:bg-purple-100 hover:text-purple-800 transition-colors"
                    >
                      <Calculator className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      value={editData.total_price || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditData({
                          ...editData,
                          total_price: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    Deposit
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editData.deposit || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditData({
                        ...editData,
                        deposit: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    Payment Method
                  </label>
                  <select
                    value={editData.payment_method || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        payment_method: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Select method</option>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Price</span>
                  <span className="font-semibold">
                    ${(booking.total_price ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount Paid</span>
                  <span className="font-semibold">
                    ${(booking.deposit ?? 0).toFixed(2)}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-green-500 h-full transition-all"
                    style={{ width: `${paymentPercentage}%` }}
                  />
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Balance Due</span>
                  <span className={`font-semibold ${balanceDue > 0 ? "text-red-600" : "text-green-600"}`}>
                    ${balanceDue.toFixed(2)}
                  </span>
                </div>

                {booking.payment_method && (
                  <div className="text-xs text-gray-600 pt-2">
                    Method: <span className="font-medium">{methodLabel}</span>
                  </div>
                )}

                {/* Record payment button and form */}
                <div className="pt-2 border-t border-gray-300">
                  {!showRecordPayment ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowRecordPayment(true)}
                      className="w-full text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Record Payment
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Amount"
                        value={paymentForm.amount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPaymentForm({
                            ...paymentForm,
                            amount: e.target.value,
                          })
                        }
                      />
                      <select
                        value={paymentForm.method}
                        onChange={(e) =>
                          setPaymentForm({
                            ...paymentForm,
                            method: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <Input
                        placeholder="Note (optional)"
                        value={paymentForm.note}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPaymentForm({
                            ...paymentForm,
                            note: e.target.value,
                          })
                        }
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleRecordPayment}
                          disabled={saving}
                          className="flex-1 text-xs"
                        >
                          {saving ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowRecordPayment(false)}
                          className="flex-1 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Admin Notes */}
          <div className="space-y-2">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="w-full flex items-center justify-between text-sm font-semibold hover:bg-gray-50 p-2 rounded"
            >
              <span className="flex items-center gap-2">
                <StickyNote className="w-4 h-4" />
                Admin Notes
              </span>
              {showNotes ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {showNotes && (
              <div className="space-y-2 pl-2">
                <textarea
                  value={editData.admin_notes || ""}
                  onChange={(e) => {
                    setEditData({
                      ...editData,
                      admin_notes: e.target.value,
                    });
                  }}
                  onBlur={handleNotesBlur}
                  placeholder="Add internal notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
                  rows={3}
                />
                {noteSaving && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Saved
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Agreement */}
          <div className="space-y-2 border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Rental Agreement
            </h3>
            {booking.signed_name ? (
              <div className="space-y-2 text-sm">
                <p className="text-gray-700">
                  Signed by: <span className="italic">{booking.signed_name}</span>
                </p>
                {booking.agreement_signed_at && (
                  <p className="text-gray-600 text-xs">
                    {formatDate(booking.agreement_signed_at)}
                  </p>
                )}
                {booking.rental_agreement_url && (
                  <a
                    href={booking.rental_agreement_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1"
                  >
                    <Link2 className="w-3 h-3" />
                    View Agreement
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Not yet signed</p>
            )}
          </div>

          {/* Tickets */}
          {bookingTickets.length > 0 && (
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Ticket className="w-4 h-4" />
                Tickets ({bookingTickets.length})
              </h3>
              <div className="space-y-2">
                {bookingTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="text-xs border-l-2 border-red-200 pl-3 py-2"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-semibold">
                        {ticket.prefix}-{ticket.ticketNumber}
                      </span>
                      <Badge className={statusColors[ticket.status] || ""}>
                        {ticket.status}
                      </Badge>
                    </div>
                    <p className="text-gray-600">
                      {ticket.municipality}, {ticket.state}
                    </p>
                    <p className="text-gray-600">
                      {formatDate(ticket.violationDate)}
                    </p>
                    <p className="font-semibold text-red-600">
                      ${(ticket.amountDue ?? 0).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
              <a
                href="/admin/tickets"
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Link2 className="w-3 h-3" />
                View All Tickets
              </a>
            </div>
          )}

          {/* Activity Timeline */}
          <div className="space-y-2 border-t border-gray-200 pt-4">
            <button
              onClick={() => setShowActivity(!showActivity)}
              className="w-full flex items-center justify-between text-sm font-semibold hover:bg-gray-50 p-2 rounded"
            >
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Activity Timeline
              </span>
              {showActivity ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {showActivity && (
              <div className="space-y-3 pl-4 text-xs">
                {activityLog.length > 0 ? (
                  activityLog.map((entry) => (
                    <div
                      key={entry.id}
                      className="border-l-2 border-gray-300 pl-3 py-2"
                    >
                      <p className="text-gray-500">
                        {formatTime(entry.created_at)}
                      </p>
                      <p className="font-medium text-gray-700">
                        {entry.action}
                      </p>
                      {entry.performed_by && (
                        <p className="text-gray-500">by {entry.performed_by}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No activity recorded</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 space-y-3">
          {editMode ? (
            <>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setEditMode(false)}
                  disabled={saving}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs"
                  title="Send email to customer"
                  disabled={sendingEmail}
                  onClick={handleSendEmail}
                >
                  <Mail className="w-3 h-3 mr-1" />
                  {sendingEmail ? "Sending..." : "Send Email"}
                </Button>
              </div>

              {booking.status !== "cancelled" && booking.status !== "completed" && (
                <div className="space-y-2">
                  {/* Next status button */}
                  {booking.status === "pending" && (
                    booking.agreement_signed_at ? (
                      <Button
                        onClick={() => updateStatus("confirmed")}
                        className="w-full bg-green-600 hover:bg-green-700 text-white text-xs"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Confirm Booking
                      </Button>
                    ) : (
                      <Button
                        onClick={() => onError("Cannot confirm — the customer has not signed the rental agreement yet.")}
                        className="w-full bg-amber-500 text-white text-xs cursor-not-allowed"
                      >
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Awaiting Agreement Signature
                      </Button>
                    )
                  )}
                  {booking.status === "confirmed" && (
                    <Button
                      onClick={() => updateStatus("active")}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Start Rental
                    </Button>
                  )}
                  {booking.status === "active" && (
                    <Button
                      onClick={() => updateStatus("completed")}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white text-xs"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Complete Rental
                    </Button>
                  )}

                  {/* Cancel button */}
                  <Button
                    onClick={() => {
                      if (window.confirm("Cancel this booking?")) {
                        updateStatus("cancelled");
                      }
                    }}
                    variant="outline"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50 text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Cancel Booking
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default BookingDetailPanel;
