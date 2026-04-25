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
  Trash2,
  CalendarPlus,
  PenLine,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import { calculateRentalHours, calculatePricing } from "@/lib/utils/price-calculator";
import { getVehicleDisplayName } from "@/lib/types";
import { logger } from "@/lib/utils/logger";
import { Location } from "@/lib/types";

/** Ensure URL is safe (no javascript: protocol) */
function safeHref(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:")) return undefined;
  return url;
}

interface BookingDetailPanelProps {
  booking: BookingRow;
  vehicles: Vehicle[];
  onClose: () => void;
  onUpdateBooking: (updated: BookingRow) => void;
  onUpdateStatus: (bookingId: string, newStatus: string) => Promise<boolean> | boolean;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
  capabilities?: {
    canSendBookingEmail: boolean;
    canViewAdminNotes: boolean;
    canViewActivityTimeline: boolean;
    canManagePayments: boolean;
    canExtendBooking: boolean;
    customerDetailsBasePath: string;
    ticketsPagePath: string;
  };
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
    capabilities,
  } = props;
  const canSendBookingEmail = capabilities?.canSendBookingEmail ?? true;
  const canViewAdminNotes = capabilities?.canViewAdminNotes ?? true;
  const canViewActivityTimeline = capabilities?.canViewActivityTimeline ?? true;
  const canManagePayments = capabilities?.canManagePayments ?? true;
  const canExtendBooking = capabilities?.canExtendBooking ?? true;
  const customerDetailsBasePath = capabilities?.customerDetailsBasePath ?? "/admin/customers";
  const ticketsPagePath = capabilities?.ticketsPagePath ?? "/admin/tickets";
  const canViewPricing = booking.canViewPricing !== false;
  const canManageRow = booking.canManage !== false;

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<BookingRow>>(JSON.parse(JSON.stringify(booking)));
  const [saving, setSaving] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  // Fetched data
  const [bookingTickets, setBookingTickets] = useState<TicketRecord[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [locations, setLocationsState] = useState<Location[]>([]);
  const [locationsError, setLocationsError] = useState<string | null>(null);

  // Email sending
  const [sendingEmail, setSendingEmail] = useState(false);
  const [resendingAgreement, setResendingAgreement] = useState(false);
  const [overridingAgreement, setOverridingAgreement] = useState(false);

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

  // Extension state
  const [showExtend, setShowExtend] = useState(false);
  const [extendDate, setExtendDate] = useState("");
  const [extendTime, setExtendTime] = useState("");
  const [extendAmount, setExtendAmount] = useState("");
  const [extending, setExtending] = useState(false);
  const [extendResult, setExtendResult] = useState<{ paymentUrl?: string; message?: string } | null>(null);

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

  // Cleanup pending timeouts on component unmount
  useEffect(() => {
    return () => {
      if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
    };
  }, []);

  // Fetch tickets, activity, and payments on mount (in parallel)
  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    const fetchDetails = async () => {
      try {
        const results = await Promise.allSettled([
          adminFetch(`/api/admin/tickets?booking_id=${booking.id}`, { signal: abortController.signal }),
          canViewActivityTimeline
            ? adminFetch(`/api/admin/booking-activity?booking_id=${booking.id}`, { signal: abortController.signal })
            : Promise.resolve(new Response(JSON.stringify({ data: [] }))),
          canManagePayments
            ? adminFetch(`/api/admin/booking-payments?booking_id=${booking.id}`, { signal: abortController.signal })
            : Promise.resolve(new Response(JSON.stringify({ data: [] }))),
        ]);

        if (cancelled) return;

        // Handle tickets result
        if (results[0]?.status === "fulfilled") {
          try {
            const ticketsData = await results[0].value.json();
            if (!cancelled) setBookingTickets(Array.isArray(ticketsData) ? ticketsData : []);
          } catch {
            // Ignore JSON parse errors
          }
        }

        // Handle activity result
        if (results[1]?.status === "fulfilled") {
          try {
            const activityResult = await results[1].value.json();
            const activityItems = activityResult.data ?? activityResult;
            if (!cancelled) setActivityLog(Array.isArray(activityItems) ? activityItems : []);
          } catch {
            // Ignore JSON parse errors
          }
        }

        // Handle payments result
        if (results[2]?.status === "fulfilled") {
          try {
            const paymentsResult = await results[2].value.json();
            const paymentItems = paymentsResult.data ?? paymentsResult;
            if (!cancelled) setPayments(Array.isArray(paymentItems) ? paymentItems : []);
          } catch {
            // Ignore JSON parse errors
          }
        }
      } catch (err) {
        if (!cancelled) logger.error("Failed to fetch booking details", err);
      }
    };

    fetchDetails();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [booking.id, canManagePayments, canViewActivityTimeline]);

  // Fetch locations
  useEffect(() => {
    adminFetch("/api/admin/locations?active=true")
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setLocationsState(data.data);
          setLocationsError(null);
        }
      })
      .catch((err) => {
        logger.error("Failed to load locations:", err);
        setLocationsError("Failed to load locations");
        onError("Could not load pickup/dropoff locations");
      });
  }, [onError]);

  // Calculate current status index
  const currentStatusIndex = STATUS_STEPS.indexOf(
    booking.status as typeof STATUS_STEPS[number]
  );

  // Sync editData when booking prop changes from parent (e.g., status update)
  useEffect(() => {
    if (!editMode) {
      setEditData(JSON.parse(JSON.stringify(booking)));
    }
  }, [booking, editMode]);

  // Handle edit mode toggle
  const toggleEditMode = () => {
    if (!editMode) {
      setEditData(JSON.parse(JSON.stringify(booking)));
    }
    setEditMode(!editMode);
  };

  // Handle status step click
  const handleStatusStepClick = (stepIndex: number) => {
    // Validate current status index is valid
    if (currentStatusIndex === -1) {
      onError("Invalid booking status");
      return;
    }

    if (stepIndex <= currentStatusIndex || booking.status === "cancelled") {
      return; // Can't go backward or change cancelled
    }

    const newStatus = STATUS_STEPS[stepIndex];
    if (!newStatus) {
      onError("Invalid status");
      return;
    }

    // Block confirming if the rental agreement hasn't been signed
    if (newStatus === "confirmed" && !booking.agreement_signed_at) {
      onError("Cannot confirm — the customer has not signed the rental agreement yet.");
      return;
    }

    setPendingStatus(newStatus);
  };

  // Update booking status
  const updateStatus = async (newStatus: string) => {
    try {
      const ok = await Promise.resolve(onUpdateStatus(booking.id, newStatus));
      if (!ok) return;

      onUpdateBooking({ ...booking, status: newStatus });

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
    if (!canSendBookingEmail) return;
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

  // Reset existing agreement and resend a fresh signing link
  const handleResendAgreement = async () => {
    if (!canSendBookingEmail) return;
    setResendingAgreement(true);
    try {
      const res = await adminFetch("/api/admin/send-booking-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, resetAgreement: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess("Old agreement cleared and new signing link sent to " + (booking.customer_email || "customer"));
        // Update local booking state to reflect cleared agreement
        onUpdateBooking({ ...booking, agreement_signed_at: undefined, rental_agreement_url: undefined, signed_name: undefined });
      } else {
        onError(data.message || data.error || "Failed to resend agreement");
      }
    } catch (err) {
      logger.error("Failed to resend agreement:", err);
      onError("Network error — could not resend agreement");
    } finally {
      setResendingAgreement(false);
    }
  };

  const handleOverrideAgreement = async () => {
    if (overridingAgreement) return;
    setOverridingAgreement(true);
    try {
      const res = await adminFetch("/api/bookings/override-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        onError(data.message || "Failed to apply override signature.");
        return;
      }

      const updated = {
        ...booking,
        signed_name: data.data?.signed_name || booking.signed_name,
        agreement_signed_at: data.data?.agreement_signed_at || booking.agreement_signed_at,
      };
      onUpdateBooking(updated);
      onSuccess(data.message || "Override signature applied.");
    } catch (err) {
      logger.error("Override agreement failed:", err);
      onError("Failed to apply override signature.");
    } finally {
      setOverridingAgreement(false);
    }
  };

  // Save edited booking
  const handleSaveChanges = async () => {
    if (saving) return;
    setSaving(true);
    // Validate required fields
    if (!editData.pickup_date) {
      onError("Pickup date is required");
      setSaving(false);
      return;
    }
    if (!editData.return_date) {
      onError("Return date is required");
      setSaving(false);
      return;
    }
    if (!editData.vehicle_id) {
      onError("Vehicle is required");
      setSaving(false);
      return;
    }
    if (new Date(editData.return_date + "T00:00:00") < new Date(editData.pickup_date + "T00:00:00")) {
      onError("Return date must be after pickup date");
      setSaving(false);
      return;
    }
    try {
      const response = await adminFetch(`/api/bookings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editData, bookingId: booking.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        onError(result.message || "Failed to save booking");
        setSaving(false);
        return;
      }

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
    if (editData.admin_notes === booking.admin_notes) {
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
    if (!canManagePayments) return;
    if (saving) return;
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
      const newDeposit = newPaymentResult.data?.new_deposit ?? (booking.deposit ?? 0) + parsedAmount;

      // Refetch full payment list so the new record has all fields (received_at, etc.)
      try {
        const listRes = await adminFetch(`/api/admin/booking-payments?booking_id=${booking.id}`);
        if (listRes.ok) {
          const listData = await listRes.json();
          setPayments(Array.isArray(listData.data) ? listData.data : []);
        }
      } catch { /* keep existing list */ }

      // Update deposit locally
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

  // Quick-toggle payment status (mark fully paid or unpaid)
  const handleTogglePaymentStatus = async (markPaid: boolean) => {
    if (!canManagePayments) return;
    if (saving) return;
    setSaving(true);
    try {
      const newDeposit = markPaid ? (booking.total_price ?? 0) : 0;
      const response = await adminFetch(`/api/bookings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, deposit: newDeposit }),
      });

      if (!response.ok) throw new Error("Failed to update payment status");

      const updated = { ...booking, deposit: newDeposit };
      onUpdateBooking(updated);
      setEditData(updated);
      onSuccess(markPaid ? "Marked as fully paid" : "Marked as unpaid");
    } catch (err) {
      logger.error("Failed to toggle payment status", err);
      onError("Failed to update payment status");
    } finally {
      setSaving(false);
    }
  };

  // Delete a payment record
  const handleDeletePayment = async (paymentId: string) => {
    if (!canManagePayments) return;
    if (saving) return;
    setSaving(true);
    try {
      const response = await adminFetch(
        `/api/admin/booking-payments?id=${paymentId}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete payment");

      const result = await response.json();
      const newDeposit = result.data?.new_deposit ?? 0;

      // Remove from local state
      setPayments(payments.filter((p) => p.id !== paymentId));

      // Update booking deposit
      const updated = { ...booking, deposit: newDeposit };
      onUpdateBooking(updated);
      setEditData(updated);
      onSuccess("Payment removed");
    } catch (err) {
      logger.error("Failed to delete payment", err);
      onError("Failed to remove payment");
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

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      onError("File size must not exceed 10MB");
      return;
    }

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
    ? getVehicleDisplayName(vehicleObj)
    : booking.vehicleName;

  // Get payment method label
  const methodLabel =
    PAYMENT_METHODS.find((m) => m.value === (editData.payment_method || booking.payment_method))?.label ||
    booking.payment_method ||
    "Not specified";

  const totalPrice = booking.total_price ?? 0;
  const paymentPercentage = totalPrice > 0
    ? Math.min(100, Math.round(((booking.deposit ?? 0) / totalPrice) * 100))
    : 0;

  // Computed payment status
  const paymentStatus: "paid" | "partial" | "unpaid" =
    (booking.deposit ?? 0) >= (booking.total_price ?? 0) && (booking.total_price ?? 0) > 0
      ? "paid"
      : (booking.deposit ?? 0) > 0
        ? "partial"
        : "unpaid";

  const paymentStatusConfig = {
    paid: { label: "Paid", color: "bg-green-100 text-green-800" },
    partial: { label: "Partial", color: "bg-yellow-100 text-yellow-800" },
    unpaid: { label: "Unpaid", color: "bg-red-100 text-red-800" },
  };

  const now = new Date();
  const pickupStart = booking.pickup_date
    ? new Date(`${booking.pickup_date}T${booking.pickup_time && /^\d{2}:\d{2}$/.test(booking.pickup_time) ? booking.pickup_time : "00:00"}:00`)
    : null;
  const canOverrideAgreement =
    canViewAdminNotes &&
    !booking.agreement_signed_at &&
    !!pickupStart &&
    !Number.isNaN(pickupStart.getTime()) &&
    now >= pickupStart;

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
    let hours = 0;
    try {
      hours = calculateRentalHours(
        pickup,
        returnD,
        (editData.pickup_time || booking.pickup_time || "10:00"),
        (editData.return_time || booking.return_time || "10:00"),
      );
    } catch {
      onError("Set return date/time after pickup date/time to recalculate");
      return;
    }
    // Map booking extras to full extras with pricing from AVAILABLE_EXTRAS
    const bookingExtras = (editData.extras ?? booking.extras ?? []) as { id: string; selected?: boolean }[];
    const mappedExtras = AVAILABLE_EXTRAS.map((ae) => {
      const match = bookingExtras.find((be) => be.id === ae.id);
      return { ...ae, selected: match?.selected ?? false };
    });
    const pricing = calculatePricing(hours, v.dailyRate, mappedExtras);
    setEditData((prev) => ({
      ...prev,
      total_price: pricing.total,
      deposit: pricing.total,
    }));
    onSuccess(`Recalculated: ${hours} hour${hours > 1 ? "s" : ""} at $${(v.dailyRate / 24).toFixed(2)}/hr = $${pricing.total.toFixed(2)}`);
  };

  // Handle extend booking
  const handleExtendBooking = async () => {
    if (!canExtendBooking) return;
    if (!extendDate) {
      onError("Please select a new return date");
      return;
    }
    const amount = parseFloat(extendAmount);
    if (isNaN(amount) || amount < 0) {
      onError("Please enter a valid extension amount (0 or more)");
      return;
    }

    // Validate new date is after current return date
    if (extendDate <= booking.return_date) {
      onError("New return date must be after the current return date");
      return;
    }

    setExtending(true);
    setExtendResult(null);
    try {
      const res = await adminFetch("/api/bookings/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          newReturnDate: extendDate,
          newReturnTime: extendTime || undefined,
          extensionAmount: amount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(data.message || "Booking extended successfully");
        setExtendResult({
          paymentUrl: data.data?.paymentUrl || undefined,
          message: data.message,
        });
        // Update the booking in parent
        onUpdateBooking({
          ...booking,
          return_date: extendDate,
          return_time: extendTime || booking.return_time,
          total_price: data.data?.newTotalPrice ?? booking.total_price,
        });
      } else {
        onError(data.message || "Failed to extend booking");
      }
    } catch (err) {
      onError("Failed to extend booking");
      logger.error("Extend booking error:", err);
    } finally {
      setExtending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex overflow-hidden">
      {/* Dark backdrop — hidden on mobile since panel is full-screen */}
      <div
        className="hidden md:block flex-1 bg-black/50 cursor-pointer"
        onClick={onClose}
      />

      {/* Slide-over panel — full-screen on mobile, side panel on desktop */}
      <div ref={panelRef} tabIndex={0} autoFocus className="w-full md:max-w-lg bg-white shadow-xl overflow-y-auto flex flex-col outline-none">
        {/* Sticky Header */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] lg:pt-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {editMode ? "Edit Booking" : "Booking Details"}
            </h2>
            <div className="flex items-center gap-2">
              {!editMode && canManageRow && booking.status !== "cancelled" && (
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
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5 sm:space-y-6">
          {/* Booking ID & Status */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 font-mono mb-1">Booking ID</p>
              <p className="font-mono text-sm">{booking.id}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-1">
                Origin: {booking.origin_channel === "manager_panel" ? "Manager Panel" : booking.origin_channel === "admin_panel" ? "Admin Panel" : booking.origin_channel === "public_checkout" ? "Public Checkout" : "Unknown"}
              </p>
            </div>
            <div>
              <Badge className={statusColors[booking.status] || ""}>
                {booking.status}
              </Badge>
            </div>
          </div>

          {/* Status Tracker */}
          {booking.status !== "cancelled" && (
            <div className="py-3 sm:py-4 border-y border-gray-200 overflow-x-auto">
              <div className="flex items-center justify-between min-w-0">
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
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-semibold transition-colors ${
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
                        <span className="text-[10px] sm:text-xs font-medium capitalize text-center leading-tight">
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
              {pendingStatus && (
                <div className="mt-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-amber-800">Move to &quot;{pendingStatus}&quot;?</span>
                  <div className="ml-auto flex gap-1.5">
                    <button onClick={() => { updateStatus(pendingStatus); setPendingStatus(null); }} className="px-3 py-1 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700">Yes</button>
                    <button onClick={() => setPendingStatus(null)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300">No</button>
                  </div>
                </div>
              )}
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
                      href={`${customerDetailsBasePath}/${booking.customer_id}`}
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
                  href={safeHref(booking.id_document_url) || "#"}
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
              <Select
                value={editData.vehicle_id || ""}
                onChange={(e) =>
                  setEditData({ ...editData, vehicle_id: e.target.value })
                }
              >
                <option value="">Select vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.year} {v.make} {v.model}
                  </option>
                ))}
              </Select>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">
                      Pickup Date
                    </label>
                    <DatePicker
                      value={editData.pickup_date || ""}
                      onChange={(val) =>
                        setEditData({
                          ...editData,
                          pickup_date: val,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">
                      Pickup Time
                    </label>
                    <Select
                      value={editData.pickup_time || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          pickup_time: e.target.value,
                        })
                      }
                    >
                      <option value="">Select time</option>
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">
                      Return Date
                    </label>
                    <DatePicker
                      value={editData.return_date || ""}
                      onChange={(val) =>
                        setEditData({
                          ...editData,
                          return_date: val,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">
                      Return Time
                    </label>
                    <Select
                      value={editData.return_time || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          return_time: e.target.value,
                        })
                      }
                    >
                      <option value="">Select time</option>
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                {/* Location */}
                {locations.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Pickup Location
                      </label>
                      <Select
                        value={editData.pickup_location_id || ""}
                        onChange={(e) => setEditData({ ...editData, pickup_location_id: e.target.value || undefined })}
                      >
                        <option value="">None</option>
                        {locations.map(l => (
                          <option key={l.id} value={l.id}>{l.name}{l.surcharge > 0 ? ` (+$${l.surcharge.toFixed(2)})` : ''}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Dropoff Location
                      </label>
                      <Select
                        value={editData.return_location_id || ""}
                        onChange={(e) => setEditData({ ...editData, return_location_id: e.target.value || undefined })}
                      >
                        <option value="">Same as pickup</option>
                        {locations.map(l => (
                          <option key={l.id} value={l.id}>{l.name}{l.surcharge > 0 ? ` (+$${l.surcharge.toFixed(2)})` : ''}</option>
                        ))}
                      </Select>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Pickup</p>
                    <p className="font-medium">{booking.pickup_date ? formatDate(booking.pickup_date) : "—"}</p>
                    {booking.pickup_time && (
                      <p className="text-gray-600 text-xs">
                        {formatTime(booking.pickup_time)}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Return</p>
                    <p className="font-medium">{booking.return_date ? formatDate(booking.return_date) : "—"}</p>
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
                {booking.extras.map((extra) => {
                  // Ensure extra has required fields
                  if (!extra?.id || !extra?.name) return null;
                  return (
                    <div
                      key={extra.id}
                      className="flex justify-between text-sm border-l-2 border-blue-200 pl-3 py-1"
                    >
                      <span className="text-gray-700">{extra.name}</span>
                      <span className="font-medium">
                        ${typeof extra.pricePerDay === 'number' ? extra.pricePerDay : '0'}/day
                      </span>
                    </div>
                  );
                })}
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
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payment Summary
              </h3>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${paymentStatusConfig[paymentStatus].color}`}>
                {paymentStatusConfig[paymentStatus].label}
              </span>
            </div>

            {editMode ? (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
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
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">
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
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">
                    Payment Method
                  </label>
                  <Select
                    value={editData.payment_method || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        payment_method: e.target.value,
                      })
                    }
                  >
                    <option value="">Select method</option>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Price</span>
                  {canViewPricing ? (
                    <span className="font-semibold">
                      ${(booking.total_price ?? 0).toFixed(2)}
                    </span>
                  ) : (
                    <span className="font-semibold text-gray-500">Hidden</span>
                  )}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount Paid</span>
                  {canViewPricing ? (
                    <span className="font-semibold">
                      ${(booking.deposit ?? 0).toFixed(2)}
                    </span>
                  ) : (
                    <span className="font-semibold text-gray-500">Hidden</span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-green-500 h-full transition-all"
                    style={{ width: `${canViewPricing ? paymentPercentage : 0}%` }}
                  />
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Balance Due</span>
                  {canViewPricing ? (
                    <span className={`font-semibold ${balanceDue > 0 ? "text-red-600" : "text-green-600"}`}>
                      ${balanceDue.toFixed(2)}
                    </span>
                  ) : (
                    <span className="font-semibold text-gray-500">Hidden</span>
                  )}
                </div>

                {booking.payment_method && (
                  <div className="text-xs text-gray-600 pt-2">
                    Method: <span className="font-medium">{methodLabel}</span>
                  </div>
                )}

                {/* Payment History */}
                {canManagePayments && payments.length > 0 && (
                  <div className="pt-2 border-t border-gray-300 space-y-1">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Payment History</p>
                    {payments.map((p) => {
                      const pMethod = PAYMENT_METHODS.find((m) => m.value === p.method)?.label || p.method;
                      const pDate = p.received_at
                        ? new Date(p.received_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "";
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between bg-white border border-gray-200 rounded px-2 py-1.5 group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-semibold text-gray-900">${(p.amount ?? 0).toFixed(2)}</span>
                              <span className="text-gray-500">{pMethod}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400">
                              {pDate && <span>{pDate}</span>}
                              {p.note && <span className="truncate">• {p.note}</span>}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeletePayment(p.id)}
                            disabled={saving}
                            className="ml-2 p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove payment"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Quick payment status toggles */}
                {canManagePayments && (
                  <div className="pt-2 flex gap-2">
                  {balanceDue > 0 ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTogglePaymentStatus(true)}
                      disabled={saving}
                      className="flex-1 text-xs text-green-700 border-green-300 hover:bg-green-50"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Mark Fully Paid
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTogglePaymentStatus(false)}
                      disabled={saving}
                      className="flex-1 text-xs text-red-700 border-red-300 hover:bg-red-50"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Mark Unpaid
                    </Button>
                  )}
                  </div>
                )}

                {/* Record payment button and form */}
                {canManagePayments && (
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
                        min="0.01"
                        placeholder="Amount"
                        value={paymentForm.amount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPaymentForm({
                            ...paymentForm,
                            amount: e.target.value,
                          })
                        }
                      />
                      <Select
                        value={paymentForm.method}
                        onChange={(e) =>
                          setPaymentForm({
                            ...paymentForm,
                            method: e.target.value,
                          })
                        }
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </Select>
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
                )}
              </div>
            )}
          </div>

          {/* Extend Booking */}
          {canExtendBooking && ["confirmed", "active"].includes(booking.status) && !editMode && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <button
                onClick={() => setShowExtend(!showExtend)}
                className="flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700"
              >
                <CalendarPlus className="h-4 w-4" />
                Extend Booking
                {showExtend ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {showExtend && (
                <div className="mt-3 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">
                    Current return: <span className="font-medium text-gray-700">{formatDate(booking.return_date)}</span>
                    {booking.return_time && ` at ${formatTime(booking.return_time)}`}
                  </p>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">New Return Date</label>
                    <input
                      type="date"
                      value={extendDate}
                      min={booking.return_date}
                      onChange={(e) => setExtendDate(e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">New Return Time (optional)</label>
                    <input
                      type="time"
                      value={extendTime}
                      onChange={(e) => setExtendTime(e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Extension Charge ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={extendAmount}
                      onChange={(e) => setExtendAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">Enter 0 for a free extension</p>
                  </div>

                  {extendDate && extendDate > booking.return_date && (
                    <div className="rounded-md border border-gray-200 bg-white p-3 text-xs space-y-1">
                      <p className="text-gray-600">
                        Extension: <span className="font-medium">{Math.ceil((new Date(extendDate + "T00:00:00").getTime() - new Date(booking.return_date + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24))} day(s)</span>
                      </p>
                      <p className="text-gray-600">
                        Additional charge: <span className="font-medium text-purple-600">${parseFloat(extendAmount || "0").toFixed(2)}</span>
                      </p>
                      <p className="text-gray-600">
                        New total: <span className="font-medium">${(Number(booking.total_price) + parseFloat(extendAmount || "0")).toFixed(2)}</span>
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleExtendBooking}
                      disabled={extending || !extendDate}
                      className="flex-1 rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {extending ? "Extending..." : "Extend & Send Payment Link"}
                    </button>
                    <button
                      onClick={() => { setShowExtend(false); setExtendResult(null); }}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>

                  {extendResult && (
                    <div className="rounded-md border border-green-200 bg-green-50 p-3">
                      <p className="text-sm font-medium text-green-700">
                        {extendResult.message || "Booking extended!"}
                      </p>
                      {extendResult.paymentUrl && (
                        <a
                          href={extendResult.paymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-xs text-purple-600 underline hover:text-purple-700"
                        >
                          View payment link →
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Admin Notes */}
          {canViewAdminNotes && (
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
                <Textarea
                  value={editData.admin_notes || ""}
                  onChange={(e) => {
                    setEditData({
                      ...editData,
                      admin_notes: e.target.value,
                    });
                  }}
                  onBlur={handleNotesBlur}
                  placeholder="Add internal notes..."
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
          )}

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
                    href={safeHref(booking.rental_agreement_url) || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1"
                  >
                    <Link2 className="w-3 h-3" />
                    View Agreement
                  </a>
                )}
                {canSendBookingEmail && (
                  <button
                    onClick={handleResendAgreement}
                    disabled={resendingAgreement}
                    className="mt-1 text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${resendingAgreement ? "animate-spin" : ""}`} />
                    {resendingAgreement ? "Sending..." : "Reset & Resend Agreement"}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Not yet signed</p>
                {canOverrideAgreement && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOverrideAgreement}
                    disabled={overridingAgreement}
                    className="text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    <PenLine className="w-3 h-3 mr-1" />
                    {overridingAgreement ? "Applying Override..." : "Override Signature (Initials)"}
                  </Button>
                )}
              </div>
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
                href={ticketsPagePath}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Link2 className="w-3 h-3" />
                View All Tickets
              </a>
            </div>
          )}

          {/* Activity Timeline */}
          {canViewActivityTimeline && (
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
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] lg:pb-4 space-y-3">
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
              {canSendBookingEmail && (
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
              )}

              {canManageRow && booking.status !== "cancelled" && booking.status !== "completed" && (
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
                    onClick={() => setConfirmingCancel(true)}
                    variant="outline"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50 text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Cancel Booking
                  </Button>
                  {confirmingCancel && (
                    <div className="mt-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="text-amber-800">Cancel this booking?</span>
                      <div className="ml-auto flex gap-1.5">
                        <button onClick={() => { updateStatus("cancelled"); setConfirmingCancel(false); }} className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700">Yes</button>
                        <button onClick={() => setConfirmingCancel(false)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300">No</button>
                      </div>
                    </div>
                  )}
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
