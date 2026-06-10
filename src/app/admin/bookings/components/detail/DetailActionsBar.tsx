"use client";

import React from "react";
import { X, Check, Mail, AlertTriangle, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isAgreementComplete } from "@/lib/agreement/agreement-complete";
import type { BookingDetailContext } from "./booking-detail-context";

interface DetailActionsBarProps {
  ctx: BookingDetailContext;
}

export function DetailActionsBar({ ctx }: DetailActionsBarProps) {
  const {
    booking,
    editMode,
    saving,
    setEditMode,
    handleSaveChanges,
    canSendBookingEmail,
    sendingEmail,
    handleSendEmail,
    canManageRow,
    showInPersonSign,
    onStartInPersonSign,
    updateStatus,
    onError,
    confirmingCancel,
    setConfirmingCancel,
  } = ctx;

  return (
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
              {showInPersonSign && (
                <Button
                  onClick={onStartInPersonSign}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs min-h-11"
                >
                  <PenLine className="w-3 h-3 mr-1" />
                  Sign in person
                </Button>
              )}
              {showInPersonSign && (
                <p className="text-xs text-center text-gray-500 -mt-1">
                  Review agreement with customer on this device
                </p>
              )}
              {/* Next status button */}
              {booking.status === "pending" && (
                isAgreementComplete(booking) ? (
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
  );
}
