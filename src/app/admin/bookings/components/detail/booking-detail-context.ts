"use client";

import type React from "react";
import type { StaffPanelBase } from "@/lib/admin/staff-panel-base";
import type { WeeklyDueDay } from "@/lib/utils/recurring-booking";
import type {
  ActivityRecord,
  BookingRow,
  PaymentRecord,
  TicketRecord,
  Vehicle,
} from "../../types";
import type { InvoicePaymentStatus } from "@/lib/invoices/invoice-status";
import type { Location } from "@/lib/types";

export interface BookingDetailCapabilities {
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
}

export interface BookingDetailContext {
  booking: BookingRow;
  vehicles: Vehicle[];
  panelBase: StaffPanelBase;
  invoicesPagePath: string;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  editData: Partial<BookingRow>;
  setEditData: React.Dispatch<React.SetStateAction<Partial<BookingRow>>>;
  saving: boolean;
  setSaving: (v: boolean) => void;
  pendingStatus: string | null;
  setPendingStatus: (v: string | null) => void;
  confirmingCancel: boolean;
  setConfirmingCancel: (v: boolean) => void;
  bookingTickets: TicketRecord[];
  activityLog: ActivityRecord[];
  setActivityLog: React.Dispatch<React.SetStateAction<ActivityRecord[]>>;
  payments: PaymentRecord[];
  setPayments: React.Dispatch<React.SetStateAction<PaymentRecord[]>>;
  locations: Location[];
  sendingEmail: boolean;
  showSendInvoiceModal: boolean;
  setShowSendInvoiceModal: (v: boolean) => void;
  invoiceSummary: {
    id: string;
    sent_at: string | null;
    paymentStatus: InvoicePaymentStatus;
  } | null;
  refreshInvoiceSummary: () => void;
  showNotes: boolean;
  setShowNotes: (v: boolean) => void;
  showActivity: boolean;
  setShowActivity: (v: boolean) => void;
  showRecordPayment: boolean;
  setShowRecordPayment: (v: boolean) => void;
  noteSaving: boolean;
  financialAccessSaving: boolean;
  paymentForm: { amount: string; method: string; note: string };
  setPaymentForm: React.Dispatch<
    React.SetStateAction<{ amount: string; method: string; note: string }>
  >;
  showExtend: boolean;
  setShowExtend: (v: boolean) => void;
  extendDate: string;
  setExtendDate: (v: string) => void;
  extendTime: string;
  setExtendTime: (v: string) => void;
  extendAmount: string;
  setExtendAmount: (v: string) => void;
  extending: boolean;
  extendResult: { paymentUrl?: string; message?: string } | null;
  setExtendResult: (v: { paymentUrl?: string; message?: string } | null) => void;
  resendingAgreement: boolean;
  overridingAgreement: boolean;
  showInPersonSign: boolean;
  canSendBookingEmail: boolean;
  canSendInvoice: boolean;
  canViewAdminNotes: boolean;
  canViewActivityTimeline: boolean;
  canManagePayments: boolean;
  canExtendBooking: boolean;
  canManageManagerFinancialAccess: boolean;
  canSignAgreementInPerson: boolean;
  customerDetailsBasePath: string;
  ticketsPagePath: string;
  canViewPricing: boolean;
  canManageRow: boolean;
  currentStatusIndex: number;
  recurringMeta: { isRecurringLongTerm: boolean; weeklyDueDay?: WeeklyDueDay };
  displayReturnDate: string;
  recurringBilling: ReturnType<
    typeof import("@/lib/utils/recurring-booking").getRecurringBillingSummary
  > | null;
  stagedRecurringReturn: string | null;
  visibleAdminNotes: string;
  canGenerateWeekToWeekContract: boolean;
  displayTotalPrice: number;
  balanceDue: number;
  hasCustomerEmail: boolean;
  canShowSendInvoice: boolean;
  vehicleLabel: string;
  methodLabel: string;
  paymentPercentage: number;
  paymentStatus: "paid" | "partial" | "unpaid";
  paymentStatusConfig: Record<"paid" | "partial" | "unpaid", { label: string; color: string }>;
  canOverrideAgreement: boolean;
  toggleEditMode: () => void;
  updateRecurringMeta: (
    next: Partial<{ isRecurringLongTerm: boolean; weeklyDueDay: WeeklyDueDay | undefined }>
  ) => void;
  handleStatusStepClick: (stepIndex: number) => void;
  updateStatus: (newStatus: string) => Promise<void>;
  handleSendEmail: () => Promise<void>;
  handleResendAgreement: () => Promise<void>;
  handleOverrideAgreement: () => Promise<void>;
  handleSaveChanges: () => Promise<void>;
  handleNotesBlur: () => void;
  handleToggleManagerFinancialAccess: (next: boolean) => Promise<void>;
  handleRecordPayment: () => Promise<void>;
  handleTogglePaymentStatus: (markPaid: boolean) => Promise<void>;
  handleDeletePayment: (paymentId: string) => Promise<void>;
  handleDocumentUpload: (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: "id_document" | "insurance_proof"
  ) => Promise<void>;
  handleDuplicateBooking: () => void;
  handleRecalculatePrice: () => void;
  handleExtendBooking: () => Promise<void>;
  handleAdvanceRecurringPeriod: () => Promise<void>;
  openWeekToWeekContract: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
  onStartInPersonSign?: () => void;
}
