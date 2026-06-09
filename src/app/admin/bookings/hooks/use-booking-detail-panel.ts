"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { logger } from "@/lib/utils/logger";
import type { Location } from "@/lib/types";
import type {
  ActivityRecord,
  BookingRow,
  PaymentRecord,
  TicketRecord,
} from "../types";
import type { InvoicePaymentStatus } from "@/lib/invoices/invoice-status";

interface UseBookingDetailPanelOptions {
  booking: BookingRow;
  onClose: () => void;
  onError: (msg: string) => void;
  canSendInvoice: boolean;
  canViewActivityTimeline: boolean;
  canManagePayments: boolean;
}

export function useBookingDetailPanel({
  booking,
  onClose,
  onError,
  canSendInvoice,
  canViewActivityTimeline,
  canManagePayments,
}: UseBookingDetailPanelOptions) {
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<BookingRow>>(JSON.parse(JSON.stringify(booking)));
  const [saving, setSaving] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const [bookingTickets, setBookingTickets] = useState<TicketRecord[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [locations, setLocationsState] = useState<Location[]>([]);
  const [locationsError, setLocationsError] = useState<string | null>(null);

  const [sendingEmail, setSendingEmail] = useState(false);
  const [showSendInvoiceModal, setShowSendInvoiceModal] = useState(false);
  const [invoiceSummary, setInvoiceSummary] = useState<{
    id: string;
    sent_at: string | null;
    paymentStatus: InvoicePaymentStatus;
  } | null>(null);

  const [showNotes, setShowNotes] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [financialAccessSaving, setFinancialAccessSaving] = useState(false);

  const [paymentForm, setPaymentForm] = useState({ amount: "", method: "stripe", note: "" });
  const [showExtend, setShowExtend] = useState(false);
  const [extendDate, setExtendDate] = useState("");
  const [extendTime, setExtendTime] = useState("");
  const [extendAmount, setExtendAmount] = useState("");
  const [extending, setExtending] = useState(false);
  const [extendResult, setExtendResult] = useState<{ paymentUrl?: string; message?: string } | null>(null);

  const notesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
      if (notesTimeoutRef.current) {
        clearTimeout(notesTimeoutRef.current);
        notesTimeoutRef.current = null;
      }
    };
  }, [onClose]);

  const refreshInvoiceSummary = useCallback(() => {
    if (!canSendInvoice) {
      setInvoiceSummary(null);
      return;
    }
    adminFetch(`/api/admin/invoices?bookingId=${encodeURIComponent(booking.id)}&limit=1`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.data) && data.data[0]) {
          const inv = data.data[0] as {
            id: string;
            sent_at: string | null;
            paymentStatus: InvoicePaymentStatus;
          };
          setInvoiceSummary({
            id: inv.id,
            sent_at: inv.sent_at,
            paymentStatus: inv.paymentStatus,
          });
        } else {
          setInvoiceSummary(null);
        }
      })
      .catch(() => setInvoiceSummary(null));
  }, [booking.id, canSendInvoice]);

  useEffect(() => {
    refreshInvoiceSummary();
  }, [refreshInvoiceSummary, showSendInvoiceModal]);

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

        if (results[0]?.status === "fulfilled") {
          try {
            const ticketsData = await results[0].value.json();
            const tickets = ticketsData?.data ?? ticketsData;
            if (!cancelled) setBookingTickets(Array.isArray(tickets) ? tickets : []);
          } catch {
            /* ignore */
          }
        }

        if (results[1]?.status === "fulfilled") {
          try {
            const activityResult = await results[1].value.json();
            const activityItems = activityResult.data ?? activityResult;
            if (!cancelled) setActivityLog(Array.isArray(activityItems) ? activityItems : []);
          } catch {
            /* ignore */
          }
        }

        if (results[2]?.status === "fulfilled") {
          try {
            const paymentsResult = await results[2].value.json();
            const paymentItems = paymentsResult.data ?? paymentsResult;
            if (!cancelled) setPayments(Array.isArray(paymentItems) ? paymentItems : []);
          } catch {
            /* ignore */
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

  useEffect(() => {
    adminFetch("/api/admin/locations?active=true")
      .then((r) => r.json())
      .then((data) => {
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

  useEffect(() => {
    if (!editMode) {
      setEditData(JSON.parse(JSON.stringify(booking)));
    }
  }, [booking, editMode]);

  return {
    editMode,
    setEditMode,
    editData,
    setEditData,
    saving,
    setSaving,
    pendingStatus,
    setPendingStatus,
    confirmingCancel,
    setConfirmingCancel,
    bookingTickets,
    activityLog,
    setActivityLog,
    payments,
    setPayments,
    locations,
    locationsError,
    sendingEmail,
    setSendingEmail,
    showSendInvoiceModal,
    setShowSendInvoiceModal,
    invoiceSummary,
    refreshInvoiceSummary,
    showNotes,
    setShowNotes,
    showActivity,
    setShowActivity,
    showRecordPayment,
    setShowRecordPayment,
    noteSaving,
    setNoteSaving,
    financialAccessSaving,
    setFinancialAccessSaving,
    paymentForm,
    setPaymentForm,
    showExtend,
    setShowExtend,
    extendDate,
    setExtendDate,
    extendTime,
    setExtendTime,
    extendAmount,
    setExtendAmount,
    extending,
    setExtending,
    extendResult,
    setExtendResult,
    notesTimeoutRef,
    panelRef,
  };
}
