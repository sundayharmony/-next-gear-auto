"use client";

import { CheckCircle2, FileText, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminCard, AdminSection } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime } from "@/lib/utils/date-helpers";
import { statusColors } from "@/lib/utils/status-colors";
import { staffBookingsHref, type StaffPanelBase } from "@/lib/admin/staff-panel-base";
import type { CustomerBookingRow } from "../customer-detail-types";

export function CustomerBookingsCard({
  bookings,
  panelBase,
}: {
  bookings: CustomerBookingRow[];
  panelBase: StaffPanelBase;
}) {
  const router = useRouter();
  const sorted = [...bookings].sort(
    (a, b) => new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime()
  );

  return (
    <AdminSection title={`Booking history (${bookings.length})`}>
      <AdminCard padding="sm">
        {bookings.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No bookings found for this customer.</p>
        ) : (
          <div className="space-y-2">
            {sorted.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => router.push(staffBookingsHref(panelBase, `booking=${b.id}`))}
                className="w-full text-left rounded-lg border border-gray-200 p-3 hover:border-purple-300 hover:bg-purple-50/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{b.vehicleName || "Unknown vehicle"}</p>
                    <p className="text-xs font-mono text-gray-400 truncate">{b.id}</p>
                  </div>
                  <Badge className={statusColors[b.status] || "bg-gray-100 text-gray-600"}>{b.status}</Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">Pickup</span>
                    <p className="font-medium text-gray-900">{formatDate(b.pickup_date)}</p>
                    {b.pickup_time ? <p className="text-gray-500">{formatTime(b.pickup_time)}</p> : null}
                  </div>
                  <div>
                    <span className="text-gray-400">Return</span>
                    <p className="font-medium text-gray-900">{formatDate(b.return_date)}</p>
                    {b.return_time ? <p className="text-gray-500">{formatTime(b.return_time)}</p> : null}
                  </div>
                  <div>
                    <span className="text-gray-400">Total</span>
                    <p className="font-semibold text-green-600">${(b.total_price ?? 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Booked</span>
                    <p className="font-medium text-gray-900">{formatDate(b.created_at)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-2 pt-2 border-t border-gray-100 text-xs">
                  <DocFlag ok={!!b.id_document_url} label="ID" />
                  <DocFlag ok={!!b.insurance_proof_url} label="Insurance" />
                  <DocFlag ok={!!b.agreement_signed_at} label="Agreement" />
                  {b.rental_agreement_url ? (
                    <a
                      href={b.rental_agreement_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-purple-600 hover:text-purple-800 ml-auto flex items-center gap-1"
                    >
                      <FileText className="h-3 w-3" /> View agreement
                    </a>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </AdminCard>
    </AdminSection>
  );
}

function DocFlag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`flex items-center gap-1 ${ok ? "text-green-600" : "text-gray-400"}`}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </span>
  );
}
