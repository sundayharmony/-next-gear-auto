"use client";

import { useCallback, useMemo, useState } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { validateBookingStatusPatch } from "@/lib/bookings";
import { calculateRentalHours, calculatePricing } from "@/lib/utils/price-calculator";
import { getVehicleDisplayName } from "@/lib/types";
import { logger } from "@/lib/utils/logger";
import { isAgreementComplete } from "@/lib/agreement/agreement-complete";
import {
  getBookingBalanceDue,
  getBookingDisplayTotal,
  getDisplayReturnDate,
  getRecurringBillingSummary,
  getStagedRecurringReturnDate,
  parseRecurringBookingMeta,
  stripRecurringBookingMeta,
  upsertRecurringBookingMeta,
  type WeeklyDueDay,
} from "@/lib/utils/recurring-booking";
import { isAllowedExternalHref } from "@/lib/utils/safe-url";
import {
  AVAILABLE_EXTRAS,
  PAYMENT_METHODS,
  STATUS_STEPS,
  type BookingRow,
  type PaymentRecord,
  type Vehicle,
} from "../types";
import type { BookingDetailCapabilities } from "../components/detail/booking-detail-context";

interface UseBookingDetailActionsOptions {
  booking: BookingRow;
  vehicles: Vehicle[];
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  editData: Partial<BookingRow>;
  setEditData: React.Dispatch<React.SetStateAction<Partial<BookingRow>>>;
  saving: boolean;
  setSaving: (v: boolean) => void;
  setPendingStatus: (v: string | null) => void;
  setActivityLog: React.Dispatch<React.SetStateAction<import("../types").ActivityRecord[]>>;
  payments: PaymentRecord[];
  setPayments: React.Dispatch<React.SetStateAction<PaymentRecord[]>>;
  setSendingEmail: (v: boolean) => void;
  setNoteSaving: (v: boolean) => void;
  financialAccessSaving: boolean;
  setFinancialAccessSaving: (v: boolean) => void;
  paymentForm: { amount: string; method: string; note: string };
  setPaymentForm: React.Dispatch<
    React.SetStateAction<{ amount: string; method: string; note: string }>
  >;
  setShowRecordPayment: (v: boolean) => void;
  extendDate: string;
  extendTime: string;
  extendAmount: string;
  setExtending: (v: boolean) => void;
  setExtendResult: (v: { paymentUrl?: string; message?: string } | null) => void;
  notesTimeoutRef: React.RefObject<ReturnType<typeof setTimeout> | null>;
  onUpdateBooking: (updated: BookingRow) => void;
  onUpdateStatus: (bookingId: string, newStatus: string) => Promise<boolean> | boolean;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
  capabilities: BookingDetailCapabilities;
  onStartInPersonSign?: () => void;
}

export function useBookingDetailActions(options: UseBookingDetailActionsOptions) {
  const {
    booking,
    vehicles,
    editMode,
    setEditMode,
    editData,
    setEditData,
    saving,
    setSaving,
    setPendingStatus,
    setActivityLog,
    payments,
    setPayments,
    setSendingEmail,
    setNoteSaving,
    financialAccessSaving,
    setFinancialAccessSaving,
    paymentForm,
    setPaymentForm,
    setShowRecordPayment,
    extendDate,
    extendTime,
    extendAmount,
    setExtending,
    setExtendResult,
    notesTimeoutRef,
    onUpdateBooking,
    onUpdateStatus,
    onError,
    onSuccess,
    capabilities,
    onStartInPersonSign,
  } = options;

  const canSendBookingEmail = capabilities.canSendBookingEmail;
  const canSendInvoice = capabilities.canSendInvoice;
  const canViewAdminNotes = capabilities.canViewAdminNotes;
  const canManagePayments = capabilities.canManagePayments;
  const canExtendBooking = capabilities.canExtendBooking;
  const canManageManagerFinancialAccess = capabilities.canManageManagerFinancialAccess ?? false;
  const canSignAgreementInPerson = capabilities.canSignAgreementInPerson;
  const canViewPricing = booking.canViewPricing !== false;
  const canManageRow = booking.canManage !== false;

  const [resendingAgreement, setResendingAgreement] = useState(false);
  const [overridingAgreement, setOverridingAgreement] = useState(false);

  const showInPersonSign =
    canSignAgreementInPerson &&
    canManageRow &&
    !isAgreementComplete(booking) &&
    booking.status !== "cancelled" &&
    booking.status !== "completed" &&
    Boolean(onStartInPersonSign);

  const currentStatusIndex = STATUS_STEPS.indexOf(
    booking.status as (typeof STATUS_STEPS)[number]
  );

  const recurringMeta = parseRecurringBookingMeta(
    typeof editData.admin_notes === "string" ? editData.admin_notes : booking.admin_notes
  );
  const displayReturnDate = getDisplayReturnDate(
    booking.return_date,
    booking.admin_notes,
    booking.effective_return_date
  );
  const recurringBilling = getRecurringBillingSummary({
    pickup_date: booking.pickup_date,
    total_price: booking.total_price,
    deposit: booking.deposit,
    admin_notes: booking.admin_notes,
  });
  const stagedRecurringReturn = getStagedRecurringReturnDate(
    booking.return_date,
    booking.admin_notes
  );
  const visibleAdminNotes = stripRecurringBookingMeta(
    typeof editData.admin_notes === "string" ? editData.admin_notes : booking.admin_notes
  );

  const canGenerateWeekToWeekContract =
    recurringMeta.isRecurringLongTerm &&
    (booking.status === "confirmed" || booking.status === "active");

  const displayTotalPrice = getBookingDisplayTotal(booking);
  const balanceDue = getBookingBalanceDue(booking);
  const hasCustomerEmail = Boolean((booking.customer_email || "").trim());
  const canShowSendInvoice =
    canSendInvoice && canViewPricing && canManageRow && hasCustomerEmail;

  const vehicleObj = vehicles.find((v) => v.id === booking.vehicle_id);
  const vehicleLabel = vehicleObj
    ? getVehicleDisplayName(vehicleObj)
    : booking.vehicleName;

  const methodLabel =
    PAYMENT_METHODS.find((m) => m.value === (editData.payment_method || booking.payment_method))
      ?.label ||
    booking.payment_method ||
    "Not specified";

  const paymentPercentage =
    displayTotalPrice > 0
      ? Math.min(100, Math.round(((booking.deposit ?? 0) / displayTotalPrice) * 100))
      : 0;

  const paymentStatus: "paid" | "partial" | "unpaid" =
    balanceDue <= 0 && displayTotalPrice > 0
      ? "paid"
      : (booking.deposit ?? 0) > 0
        ? "partial"
        : "unpaid";

  const paymentStatusConfig = useMemo(
    () => ({
      paid: { label: "Paid", color: "bg-green-100 text-green-800" },
      partial: { label: "Partial", color: "bg-yellow-100 text-yellow-800" },
      unpaid: { label: "Unpaid", color: "bg-red-100 text-red-800" },
    }),
    []
  );

  const now = new Date();
  const pickupStart = booking.pickup_date
    ? new Date(
        `${booking.pickup_date}T${booking.pickup_time && /^\d{2}:\d{2}$/.test(booking.pickup_time) ? booking.pickup_time : "00:00"}:00`
      )
    : null;
  const canOverrideAgreement =
    canViewAdminNotes &&
    !isAgreementComplete(booking) &&
    !!pickupStart &&
    !Number.isNaN(pickupStart.getTime()) &&
    now >= pickupStart;

  const openWeekToWeekContract = useCallback(() => {
    const params = new URLSearchParams({ bookingId: booking.id });
    if (recurringMeta.weeklyDueDay) {
      params.set("weeklyDueDay", recurringMeta.weeklyDueDay);
    }
    window.open(`/week-to-week-contract?${params.toString()}`, "_blank", "noopener,noreferrer");
  }, [booking.id, recurringMeta.weeklyDueDay]);

  const handleAdvanceRecurringPeriod = useCallback(async () => {
    if (!stagedRecurringReturn || saving) return;
    setSaving(true);
    try {
      const response = await adminFetch(`/api/bookings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          advanceRecurringPeriod: true,
        }),
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.message || "Failed to advance billing period");
      }
      const updated = { ...booking, return_date: stagedRecurringReturn };
      onUpdateBooking(updated);
      setEditData(updated);
      onSuccess(`Billing period advanced to ${stagedRecurringReturn}`);
    } catch (err) {
      logger.error("Failed to advance recurring period", err);
      onError(err instanceof Error ? err.message : "Failed to advance billing period");
    } finally {
      setSaving(false);
    }
  }, [
    stagedRecurringReturn,
    saving,
    booking,
    onUpdateBooking,
    setEditData,
    onSuccess,
    onError,
    setSaving,
  ]);

  const toggleEditMode = useCallback(() => {
    if (!editMode) {
      setEditData(JSON.parse(JSON.stringify(booking)));
    }
    setEditMode(!editMode);
  }, [editMode, booking, setEditData, setEditMode]);

  const updateRecurringMeta = useCallback(
    (
      next: Partial<{ isRecurringLongTerm: boolean; weeklyDueDay: WeeklyDueDay | undefined }>
    ) => {
      const current = parseRecurringBookingMeta(
        typeof editData.admin_notes === "string" ? editData.admin_notes : booking.admin_notes
      );
      const merged = {
        isRecurringLongTerm: next.isRecurringLongTerm ?? current.isRecurringLongTerm,
        weeklyDueDay: next.weeklyDueDay ?? current.weeklyDueDay,
      };
      if (!merged.isRecurringLongTerm) {
        merged.weeklyDueDay = undefined;
      }
      const updatedNotes = upsertRecurringBookingMeta(
        typeof editData.admin_notes === "string" ? editData.admin_notes : booking.admin_notes,
        merged
      );
      setEditData({ ...editData, admin_notes: updatedNotes });
    },
    [editData, booking.admin_notes, setEditData]
  );

  const handleStatusStepClick = useCallback(
    (stepIndex: number) => {
      if (currentStatusIndex === -1) {
        onError("Invalid booking status");
        return;
      }
      if (stepIndex <= currentStatusIndex || booking.status === "cancelled") return;

      const newStatus = STATUS_STEPS[stepIndex];
      if (!newStatus) {
        onError("Invalid status");
        return;
      }

      const patch = validateBookingStatusPatch({
        currentStatus: booking.status,
        newStatus,
        agreementSignedAt: booking.agreement_signed_at,
      });
      if (!patch.ok) {
        onError(patch.message);
        return;
      }
      setPendingStatus(newStatus);
    },
    [currentStatusIndex, booking, onError, setPendingStatus]
  );

  const updateStatus = useCallback(
    async (newStatus: string) => {
      try {
        const ok = await Promise.resolve(onUpdateStatus(booking.id, newStatus));
        if (!ok) return;

        onUpdateBooking({ ...booking, status: newStatus });

        await adminFetch(`/api/admin/booking-activity`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            booking_id: booking.id,
            action: "status_changed",
            details: { from: booking.status, to: newStatus },
          }),
        });

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
    },
    [booking, onUpdateStatus, onUpdateBooking, setActivityLog, onSuccess, onError]
  );

  const handleSendEmail = useCallback(async () => {
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
  }, [canSendBookingEmail, booking, onSuccess, onError, setSendingEmail]);

  const handleResendAgreement = useCallback(async () => {
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
        onSuccess(
          "Old agreement cleared and new signing link sent to " +
            (booking.customer_email || "customer")
        );
        onUpdateBooking({
          ...booking,
          agreement_signed_at: undefined,
          rental_agreement_url: undefined,
          signed_name: undefined,
        });
      } else {
        onError(data.message || data.error || "Failed to resend agreement");
      }
    } catch (err) {
      logger.error("Failed to resend agreement:", err);
      onError("Network error — could not resend agreement");
    } finally {
      setResendingAgreement(false);
    }
  }, [canSendBookingEmail, booking, onSuccess, onError, onUpdateBooking]);

  const handleOverrideAgreement = useCallback(async () => {
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
  }, [overridingAgreement, booking, onUpdateBooking, onSuccess, onError]);

  const handleSaveChanges = useCallback(async () => {
    if (saving) return;
    setSaving(true);
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
    if (
      new Date(editData.return_date + "T00:00:00") <
      new Date(editData.pickup_date + "T00:00:00")
    ) {
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
  }, [
    saving,
    editData,
    booking,
    onUpdateBooking,
    setEditData,
    setEditMode,
    onSuccess,
    onError,
    setSaving,
  ]);

  const saveNotes = useCallback(async () => {
    if (editData.admin_notes === booking.admin_notes) return;
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
      if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
      notesTimeoutRef.current = setTimeout(() => setNoteSaving(false), 1500);
    } catch (err) {
      setNoteSaving(false);
      logger.error("Failed to save notes", err);
      onError("Failed to save notes");
    }
  }, [editData.admin_notes, booking, onUpdateBooking, setNoteSaving, notesTimeoutRef, onError]);

  const handleNotesBlur = useCallback(() => {
    if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
    notesTimeoutRef.current = setTimeout(saveNotes, 500);
  }, [notesTimeoutRef, saveNotes]);

  const handleToggleManagerFinancialAccess = useCallback(
    async (next: boolean) => {
      if (!canManageManagerFinancialAccess || financialAccessSaving) return;
      setFinancialAccessSaving(true);
      try {
        const response = await adminFetch(`/api/bookings`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: booking.id, manager_financial_access: next }),
        });
        if (!response.ok) throw new Error("Failed to update manager access");
        const result = await response.json();
        const updated = result.data
          ? { ...booking, ...result.data }
          : { ...booking, manager_financial_access: next };
        onUpdateBooking(updated);
        onSuccess(
          next
            ? "Manager financial access enabled for this booking"
            : "Manager financial access disabled for this booking"
        );
      } catch (err) {
        logger.error("Failed to toggle manager financial access", err);
        onError("Failed to update manager access");
      } finally {
        setFinancialAccessSaving(false);
      }
    },
    [
      canManageManagerFinancialAccess,
      financialAccessSaving,
      booking,
      onUpdateBooking,
      onSuccess,
      onError,
      setFinancialAccessSaving,
    ]
  );

  const handleRecordPayment = useCallback(async () => {
    if (!canManagePayments || saving) return;
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
      const newDeposit =
        newPaymentResult.data?.new_deposit ?? (booking.deposit ?? 0) + parsedAmount;
      try {
        const listRes = await adminFetch(
          `/api/admin/booking-payments?booking_id=${booking.id}`
        );
        if (listRes.ok) {
          const listData = await listRes.json();
          setPayments(Array.isArray(listData.data) ? listData.data : []);
        }
      } catch {
        /* keep existing list */
      }
      onUpdateBooking({ ...booking, deposit: newDeposit });
      setPaymentForm({ amount: "", method: "stripe", note: "" });
      setShowRecordPayment(false);
      onSuccess("Payment recorded successfully");
    } catch (err) {
      logger.error("Failed to record payment", err);
      onError("Failed to record payment");
    } finally {
      setSaving(false);
    }
  }, [
    canManagePayments,
    saving,
    paymentForm,
    booking,
    onUpdateBooking,
    setPayments,
    setPaymentForm,
    setShowRecordPayment,
    onSuccess,
    onError,
    setSaving,
  ]);

  const handleTogglePaymentStatus = useCallback(
    async (markPaid: boolean) => {
      if (!canManagePayments || saving) return;
      setSaving(true);
      try {
        if (markPaid && recurringBilling) {
          const response = await adminFetch(`/api/admin/booking-payments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              booking_id: booking.id,
              sync_recurring_weeks: true,
            }),
          });
          if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            throw new Error(errBody.message || "Failed to sync recurring payments");
          }
          const result = await response.json();
          const newDeposit = result.data?.new_deposit ?? recurringBilling.contractTotalToDate;
          const listRes = await adminFetch(
            `/api/admin/booking-payments?booking_id=${booking.id}`
          );
          if (listRes.ok) {
            const listJson = await listRes.json();
            setPayments(listJson.data ?? listJson ?? []);
          }
          const updated = {
            ...booking,
            deposit: newDeposit,
            effective_total_price: recurringBilling.contractTotalToDate,
          };
          onUpdateBooking(updated);
          setEditData(updated);
          onSuccess(
            result.data?.payments_added
              ? `Marked caught up through ${recurringBilling.weeksDue} week(s)`
              : "Already caught up on weekly payments"
          );
          return;
        }

        if (!markPaid && recurringBilling) {
          for (const payment of payments) {
            const delRes = await adminFetch(
              `/api/admin/booking-payments?id=${payment.id}`,
              { method: "DELETE" }
            );
            if (!delRes.ok) throw new Error("Failed to clear payment records");
          }
          setPayments([]);
        }

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
        onSuccess(
          markPaid
            ? "Marked as fully paid"
            : recurringBilling
              ? "Cleared weekly payment records"
              : "Marked as unpaid"
        );
      } catch (err) {
        logger.error("Failed to toggle payment status", err);
        onError(err instanceof Error ? err.message : "Failed to update payment status");
      } finally {
        setSaving(false);
      }
    },
    [
      canManagePayments,
      saving,
      recurringBilling,
      booking,
      payments,
      onUpdateBooking,
      setEditData,
      setPayments,
      onSuccess,
      onError,
      setSaving,
    ]
  );

  const handleDeletePayment = useCallback(
    async (paymentId: string) => {
      if (!canManagePayments || saving) return;
      setSaving(true);
      try {
        const response = await adminFetch(
          `/api/admin/booking-payments?id=${paymentId}`,
          { method: "DELETE" }
        );
        if (!response.ok) throw new Error("Failed to delete payment");
        const result = await response.json();
        const newDeposit = result.data?.new_deposit ?? 0;
        setPayments(payments.filter((p) => p.id !== paymentId));
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
    },
    [
      canManagePayments,
      saving,
      payments,
      booking,
      onUpdateBooking,
      setEditData,
      setPayments,
      onSuccess,
      onError,
      setSaving,
    ]
  );

  const handleDocumentUpload = useCallback(
    async (
      e: React.ChangeEvent<HTMLInputElement>,
      docType: "id_document" | "insurance_proof"
    ) => {
      const file = e.target.files?.[0];
      if (!file) return;
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
        const fieldName =
          docType === "id_document" ? "id_document_url" : "insurance_proof_url";
        onUpdateBooking({ ...booking, [fieldName]: result.url });
        onSuccess(
          `${docType === "id_document" ? "ID document" : "Insurance proof"} uploaded`
        );
      } catch (err) {
        logger.error(`${docType} upload failed`, err);
        onError(
          `Failed to upload ${docType === "id_document" ? "ID document" : "insurance proof"}`
        );
      } finally {
        setSaving(false);
      }
    },
    [booking, onUpdateBooking, onSuccess, onError, setSaving]
  );

  const handleDuplicateBooking = useCallback(() => {
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
  }, [booking, onSuccess]);

  const handleRecalculatePrice = useCallback(() => {
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
        editData.pickup_time || booking.pickup_time || "10:00",
        editData.return_time || booking.return_time || "10:00"
      );
    } catch {
      onError("Set return date/time after pickup date/time to recalculate");
      return;
    }
    const bookingExtras = (editData.extras ?? booking.extras ?? []) as {
      id: string;
      selected?: boolean;
    }[];
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
    onSuccess(
      `Recalculated: ${hours} hour${hours > 1 ? "s" : ""} at $${(v.dailyRate / 24).toFixed(2)}/hr = $${pricing.total.toFixed(2)}`
    );
  }, [editData, booking, vehicles, setEditData, onError, onSuccess]);

  const handleExtendBooking = useCallback(async () => {
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
  }, [
    canExtendBooking,
    extendDate,
    extendAmount,
    extendTime,
    booking,
    onUpdateBooking,
    onSuccess,
    onError,
    setExtending,
    setExtendResult,
  ]);

  return {
    resendingAgreement,
    overridingAgreement,
    showInPersonSign,
    currentStatusIndex,
    recurringMeta,
    displayReturnDate,
    recurringBilling,
    stagedRecurringReturn,
    visibleAdminNotes,
    canGenerateWeekToWeekContract,
    displayTotalPrice,
    balanceDue,
    hasCustomerEmail,
    canShowSendInvoice,
    vehicleLabel,
    methodLabel,
    paymentPercentage,
    paymentStatus,
    paymentStatusConfig,
    canOverrideAgreement,
    canViewPricing,
    canManageRow,
    openWeekToWeekContract,
    handleAdvanceRecurringPeriod,
    toggleEditMode,
    updateRecurringMeta,
    handleStatusStepClick,
    updateStatus,
    handleSendEmail,
    handleResendAgreement,
    handleOverrideAgreement,
    handleSaveChanges,
    handleNotesBlur,
    handleToggleManagerFinancialAccess,
    handleRecordPayment,
    handleTogglePaymentStatus,
    handleDeletePayment,
    handleDocumentUpload,
    handleDuplicateBooking,
    handleRecalculatePrice,
    handleExtendBooking,
  };
}
