"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useStaffPanelConfig } from "@/lib/hooks/use-staff-panel-config";
import { staffInvoicesHref } from "@/lib/admin/staff-panel-config";
import { X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookingRow, Vehicle } from "../types";
import { useBookingDetailPanel } from "../hooks/use-booking-detail-panel";
import { useBookingDetailActions } from "../hooks/use-booking-detail-actions";
import type { BookingDetailContext } from "./detail/booking-detail-context";
import { DetailStatusSection } from "./detail/DetailStatusSection";
import { DetailPaymentsSection } from "./detail/DetailPaymentsSection";
import { DetailNotesSection } from "./detail/DetailNotesSection";
import { DetailAgreementSection } from "./detail/DetailAgreementSection";
import { DetailTuroSection } from "./detail/DetailTuroSection";
import { DetailActionsBar } from "./detail/DetailActionsBar";

const SendInvoiceModal = dynamic(
  () => import("./SendInvoiceModal").then((m) => m.SendInvoiceModal),
  { ssr: false }
);

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
    canSendInvoice: boolean;
    canViewAdminNotes: boolean;
    canViewActivityTimeline: boolean;
    canManagePayments: boolean;
    canExtendBooking: boolean;
    canSignAgreementInPerson: boolean;
    canManageManagerFinancialAccess?: boolean;
    customerDetailsBasePath: string;
    ticketsPagePath: string;
  };
  onStartInPersonSign?: () => void;
}

export function BookingDetailPanel(props: BookingDetailPanelProps) {
  const panelConfig = useStaffPanelConfig();
  const {
    booking,
    vehicles,
    onClose,
    onUpdateBooking,
    onUpdateStatus,
    onError,
    onSuccess,
    capabilities,
    onStartInPersonSign,
  } = props;

  const resolvedCapabilities = {
    canSendBookingEmail: capabilities?.canSendBookingEmail ?? true,
    canSendInvoice: capabilities?.canSendInvoice ?? true,
    canViewAdminNotes: capabilities?.canViewAdminNotes ?? true,
    canViewActivityTimeline: capabilities?.canViewActivityTimeline ?? true,
    canManagePayments: capabilities?.canManagePayments ?? true,
    canExtendBooking: capabilities?.canExtendBooking ?? true,
    canManageManagerFinancialAccess: capabilities?.canManageManagerFinancialAccess ?? false,
    canSignAgreementInPerson: capabilities?.canSignAgreementInPerson ?? false,
    customerDetailsBasePath: capabilities?.customerDetailsBasePath ?? "/admin/customers",
    ticketsPagePath: capabilities?.ticketsPagePath ?? "/admin/tickets",
  };

  const panelState = useBookingDetailPanel({
    booking,
    onClose,
    onError,
    canSendInvoice: resolvedCapabilities.canSendInvoice,
    canViewActivityTimeline: resolvedCapabilities.canViewActivityTimeline,
    canManagePayments: resolvedCapabilities.canManagePayments,
  });

  const actions = useBookingDetailActions({
    booking,
    vehicles,
    editMode: panelState.editMode,
    setEditMode: panelState.setEditMode,
    editData: panelState.editData,
    setEditData: panelState.setEditData,
    saving: panelState.saving,
    setSaving: panelState.setSaving,
    setPendingStatus: panelState.setPendingStatus,
    setActivityLog: panelState.setActivityLog,
    payments: panelState.payments,
    setPayments: panelState.setPayments,
    setSendingEmail: panelState.setSendingEmail,
    setNoteSaving: panelState.setNoteSaving,
    financialAccessSaving: panelState.financialAccessSaving,
    setFinancialAccessSaving: panelState.setFinancialAccessSaving,
    paymentForm: panelState.paymentForm,
    setPaymentForm: panelState.setPaymentForm,
    setShowRecordPayment: panelState.setShowRecordPayment,
    extendDate: panelState.extendDate,
    extendTime: panelState.extendTime,
    extendAmount: panelState.extendAmount,
    setExtending: panelState.setExtending,
    setExtendResult: panelState.setExtendResult,
    notesTimeoutRef: panelState.notesTimeoutRef,
    onUpdateBooking,
    onUpdateStatus,
    onError,
    onSuccess,
    capabilities: resolvedCapabilities,
    onStartInPersonSign,
  });

  const invoicesPagePath = staffInvoicesHref(panelConfig.panelBase);

  const {
    panelRef: _panelRef,
    locationsError: _locationsError,
    notesTimeoutRef: _notesTimeoutRef,
    ...panelCtx
  } = panelState;

  const detailCtx: BookingDetailContext = {
    booking,
    vehicles,
    panelBase: panelConfig.panelBase,
    invoicesPagePath,
    ...panelCtx,
    ...actions,
    canSendBookingEmail: resolvedCapabilities.canSendBookingEmail,
    canSendInvoice: resolvedCapabilities.canSendInvoice,
    canViewAdminNotes: resolvedCapabilities.canViewAdminNotes,
    canViewActivityTimeline: resolvedCapabilities.canViewActivityTimeline,
    canManagePayments: resolvedCapabilities.canManagePayments,
    canExtendBooking: resolvedCapabilities.canExtendBooking,
    canManageManagerFinancialAccess: resolvedCapabilities.canManageManagerFinancialAccess,
    canSignAgreementInPerson: resolvedCapabilities.canSignAgreementInPerson,
    customerDetailsBasePath: resolvedCapabilities.customerDetailsBasePath,
    ticketsPagePath: resolvedCapabilities.ticketsPagePath,
    onError,
    onSuccess,
    onStartInPersonSign,
  };

  return (
    <div className="fixed inset-0 z-[100] flex overflow-hidden">
      <div
        className="hidden md:block flex-1 bg-black/50 cursor-pointer"
        onClick={onClose}
      />

      <div
        ref={panelState.panelRef}
        tabIndex={0}
        autoFocus
        className="w-full md:max-w-lg bg-white shadow-xl overflow-y-auto flex flex-col outline-none"
      >
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] lg:pt-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {panelState.editMode ? "Edit Booking" : "Booking Details"}
            </h2>
            <div className="flex items-center gap-2">
              {!panelState.editMode &&
                actions.canManageRow &&
                booking.status !== "cancelled" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={actions.toggleEditMode}
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

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5 sm:space-y-6">
          <DetailStatusSection ctx={detailCtx} />
          <DetailPaymentsSection ctx={detailCtx} />
          <DetailAgreementSection ctx={detailCtx} />
          <DetailTuroSection ctx={detailCtx} />
          <DetailNotesSection ctx={detailCtx} />
        </div>

        <DetailActionsBar ctx={detailCtx} />
      </div>

      {panelState.showSendInvoiceModal && actions.canShowSendInvoice && (
        <SendInvoiceModal
          bookingId={booking.id}
          onClose={() => panelState.setShowSendInvoiceModal(false)}
          onSuccess={onSuccess}
          onError={onError}
          onSent={panelState.refreshInvoiceSummary}
        />
      )}
    </div>
  );
}

export default BookingDetailPanel;
