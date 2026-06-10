"use client";

import React from "react";
import {
  RefreshCw,
  ChevronDown,
  ChevronUp,
  StickyNote,
  Shield,
  Check,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { upsertRecurringBookingMeta } from "@/lib/utils/recurring-booking";
import { formatTime } from "@/lib/utils/date-helpers";
import type { BookingDetailContext } from "./booking-detail-context";

interface DetailNotesSectionProps {
  ctx: BookingDetailContext;
}

export function DetailNotesSection({ ctx }: DetailNotesSectionProps) {
  const {
    booking,
    editData,
    setEditData,
    canViewAdminNotes,
    showNotes,
    setShowNotes,
    visibleAdminNotes,
    recurringMeta,
    handleNotesBlur,
    noteSaving,
    canManageManagerFinancialAccess,
    financialAccessSaving,
    handleToggleManagerFinancialAccess,
    canViewActivityTimeline,
    showActivity,
    setShowActivity,
    activityLog,
  } = ctx;

  return (
    <>
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
              value={visibleAdminNotes}
              onChange={(e) => {
                const updatedNotes = upsertRecurringBookingMeta(e.target.value, recurringMeta);
                setEditData({
                  ...editData,
                  admin_notes: updatedNotes,
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

      {/* Manager Access Settings — admin-only, per-booking financial grant.
          Managers never see this toggle (capability is false for them) and
          cannot set it via the API (server rejects the field for managers). */}
      {canManageManagerFinancialAccess && (
        <div className="space-y-2 border-t border-gray-200 pt-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Manager Access Settings
          </h3>
          <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={booking.manager_financial_access === true}
              disabled={financialAccessSaving}
              onChange={(e) => handleToggleManagerFinancialAccess(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm">
              <span className="font-medium text-gray-900">
                Allow manager to view financial details for this booking
              </span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Applies to this booking only. When off, managers can view the
                booking but never its pricing, payments, or payment status.
              </span>
            </span>
          </label>
          {financialAccessSaving && (
            <p className="text-xs text-gray-500 flex items-center gap-1 pl-2">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Saving…
            </p>
          )}
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
    </>
  );
}
