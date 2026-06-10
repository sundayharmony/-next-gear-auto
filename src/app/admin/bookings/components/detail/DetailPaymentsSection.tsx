"use client";

import React from "react";
import Link from "next/link";
import {
  X,
  Check,
  Mail,
  CreditCard,
  Calculator,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  CalendarPlus,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PAYMENT_METHODS } from "../../types";
import { formatDate, formatTime } from "@/lib/utils/date-helpers";
import { isAllowedExternalHref } from "@/lib/utils/safe-url";
import {
  WEEKLY_DUE_DAY_OPTIONS,
  type WeeklyDueDay,
} from "@/lib/utils/recurring-booking";
import {
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
} from "@/lib/invoices/invoice-status";
import type { BookingDetailContext } from "./booking-detail-context";

interface DetailPaymentsSectionProps {
  ctx: BookingDetailContext;
}

export function DetailPaymentsSection({ ctx }: DetailPaymentsSectionProps) {
  const {
    booking,
    editMode,
    editData,
    setEditData,
    saving,
    canViewPricing,
    paymentStatusConfig,
    paymentStatus,
    recurringBilling,
    displayTotalPrice,
    balanceDue,
    paymentPercentage,
    methodLabel,
    canSendInvoice,
    canManageRow,
    hasCustomerEmail,
    setShowSendInvoiceModal,
    invoiceSummary,
    invoicesPagePath,
    canManagePayments,
    payments,
    handleDeletePayment,
    handleTogglePaymentStatus,
    showRecordPayment,
    setShowRecordPayment,
    paymentForm,
    setPaymentForm,
    handleRecordPayment,
    handleRecalculatePrice,
    canExtendBooking,
    showExtend,
    setShowExtend,
    displayReturnDate,
    extendDate,
    setExtendDate,
    extendTime,
    setExtendTime,
    extendAmount,
    setExtendAmount,
    extending,
    handleExtendBooking,
    setExtendResult,
    extendResult,
    recurringMeta,
    updateRecurringMeta,
    stagedRecurringReturn,
    handleAdvanceRecurringPeriod,
    canGenerateWeekToWeekContract,
    openWeekToWeekContract,
  } = ctx;

  return (
    <>
      {/* Payment Summary Card — hidden entirely (no placeholders) when the
          viewer can't see financials, so managers without per-booking access
          get a clean layout with no empty gaps. */}
      {canViewPricing && (
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
              <span className="text-gray-600">
                {recurringBilling ? "Weekly rate" : "Total Price"}
              </span>
              <span className="font-semibold">
                ${(recurringBilling?.weeklyRate ?? booking.total_price ?? 0).toFixed(2)}
              </span>
            </div>
            {recurringBilling && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Contract to date ({recurringBilling.weeksDue} week
                  {recurringBilling.weeksDue === 1 ? "" : "s"})
                </span>
                <span className="font-semibold">${displayTotalPrice.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Amount Received</span>
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

            {canSendInvoice && canManageRow && (
              <div className="pt-2 border-t border-gray-300 space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSendInvoiceModal(true)}
                  disabled={!hasCustomerEmail}
                  title={hasCustomerEmail ? "Email invoice to customer" : "Customer email required"}
                  className="w-full text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  <Mail className="w-3 h-3 mr-1" />
                  Send Invoice
                </Button>
                {invoiceSummary && (
                  <p className="text-xs text-gray-600">
                    Last sent{" "}
                    {invoiceSummary.sent_at
                      ? new Date(invoiceSummary.sent_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                    {" — "}
                    <Badge className={`text-[10px] px-1 py-0 ${INVOICE_STATUS_COLORS[invoiceSummary.paymentStatus]}`}>
                      {INVOICE_STATUS_LABELS[invoiceSummary.paymentStatus]}
                    </Badge>
                    {" · "}
                    <Link
                      href={`${invoicesPagePath}?invoice=${invoiceSummary.id}`}
                      className="text-purple-600 hover:underline"
                    >
                      View invoice
                    </Link>
                  </p>
                )}
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
                  {recurringBilling
                    ? "Mark weekly payments caught up"
                    : "Mark Fully Paid"}
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
                  onClick={() => {
                    const weeklyDefault = recurringBilling?.weeklyRate;
                    setPaymentForm((prev) => ({
                      ...prev,
                      amount:
                        weeklyDefault && weeklyDefault > 0
                          ? weeklyDefault.toFixed(2)
                          : prev.amount,
                    }));
                    setShowRecordPayment(true);
                  }}
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
      )}

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
                Current return: <span className="font-medium text-gray-700">{formatDate(displayReturnDate)}</span>
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
                      href={isAllowedExternalHref(extendResult.paymentUrl) ?? "#"}
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

      {/* Recurring Long-Term */}
      <div className="space-y-3 border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <CalendarPlus className="w-4 h-4" />
          Recurring Long-Term
        </h3>

        {editMode ? (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={recurringMeta.isRecurringLongTerm}
                onChange={(e) =>
                  updateRecurringMeta({ isRecurringLongTerm: e.target.checked })
                }
                className="rounded border-gray-300 accent-purple-600"
              />
              Mark this booking as recurring long-term
            </label>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">
                Weekly Due Day
              </label>
              <Select
                value={recurringMeta.weeklyDueDay || ""}
                onChange={(e) =>
                  updateRecurringMeta({
                    weeklyDueDay: (e.target.value || undefined) as WeeklyDueDay | undefined,
                  })
                }
                disabled={!recurringMeta.isRecurringLongTerm}
              >
                <option value="">Select due day</option>
                {WEEKLY_DUE_DAY_OPTIONS.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {recurringMeta.isRecurringLongTerm ? (
              <>
                <Badge className="bg-purple-100 text-purple-800">
                  Recurring Long-Term: Enabled
                </Badge>
                <p className="text-sm text-gray-600">
                  Weekly due day:{" "}
                  <span className="font-medium text-gray-800">
                    {recurringMeta.weeklyDueDay || "Not set"}
                  </span>
                </p>
                {stagedRecurringReturn ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    disabled={saving}
                    onClick={() => void handleAdvanceRecurringPeriod()}
                  >
                    Advance billing period to {stagedRecurringReturn}
                  </Button>
                ) : null}
                {canGenerateWeekToWeekContract ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={openWeekToWeekContract}
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    Open Week-to-Week Contract
                  </Button>
                ) : (
                  <p className="text-xs text-amber-700">
                    Week-to-week contract is available after booking is confirmed or active.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">
                Not marked as recurring long-term.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
