"use client";

import { Ticket } from "lucide-react";
import { AdminCard, AdminSection } from "@/components/admin/admin-shell";
import { formatDate } from "@/lib/utils/date-helpers";
import type { CustomerTicketRow } from "../customer-detail-types";

export function CustomerTicketsCard({ tickets }: { tickets: CustomerTicketRow[] }) {
  const unpaidTotal = tickets
    .filter((t) => t.status === "unpaid")
    .reduce((s, t) => s + (t.amountDue ?? 0), 0);

  return (
    <AdminSection
      title={`Tickets (${tickets.length})`}
      actions={
        tickets.length > 0 ? (
          <span className="text-xs font-bold text-red-600">${unpaidTotal.toLocaleString()} unpaid</span>
        ) : null
      }
    >
      <AdminCard padding="sm">
        {tickets.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No tickets for this customer</p>
        ) : (
          <div className="space-y-2">
            {[...tickets]
              .sort((a, b) => new Date(b.violationDate).getTime() - new Date(a.violationDate).getTime())
              .map((t) => (
                <div
                  key={t.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${
                    t.status === "unpaid"
                      ? "bg-red-50 border-red-100"
                      : t.status === "paid"
                        ? "bg-green-50 border-green-100"
                        : "bg-gray-50 border-gray-100"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      t.ticketType === "traffic" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                    }`}
                  >
                    <Ticket className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {t.prefix && t.ticketNumber
                          ? `${t.prefix}-${t.ticketNumber}`
                          : t.ticketType === "traffic"
                            ? "Traffic violation"
                            : "Parking violation"}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize bg-white/80">
                        {t.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {t.municipality}
                      {t.state ? `, ${t.state}` : ""} · {formatDate(t.violationDate)}
                      {t.vehicleName ? ` · ${t.vehicleName}` : ""}
                    </p>
                  </div>
                  <p className={`font-bold shrink-0 ${t.status === "unpaid" ? "text-red-600" : "text-gray-600"}`}>
                    ${t.amountDue.toLocaleString()}
                  </p>
                </div>
              ))}
          </div>
        )}
      </AdminCard>
    </AdminSection>
  );
}
