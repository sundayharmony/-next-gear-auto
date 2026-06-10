"use client";

import React from "react";
import { Ticket, Link2, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/date-helpers";
import { statusColors } from "@/lib/utils/status-colors";
import type { BookingDetailContext } from "./booking-detail-context";

interface DetailTuroSectionProps {
  ctx: BookingDetailContext;
}

export function DetailTuroSection({ ctx }: DetailTuroSectionProps) {
  const { booking, bookingTickets, ticketsPagePath } = ctx;

  const hasTuroMetadata =
    Boolean(booking.turo_reason) ||
    Boolean(booking.turo_location) ||
    booking.turo_is_extension === true;

  if (bookingTickets.length === 0 && !hasTuroMetadata) {
    return null;
  }

  return (
    <>
      {hasTuroMetadata && (
        <div className="space-y-3 border-t border-gray-200 pt-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Turo Metadata
          </h3>
          {booking.turo_location ? (
            <div>
              <p className="text-xs text-gray-500">Pickup location</p>
              <p className="text-sm font-medium text-gray-800">{booking.turo_location}</p>
            </div>
          ) : null}
          {booking.turo_is_extension ? (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              Extension detected for this Turo trip.
            </div>
          ) : null}
          {booking.turo_reason ? (
            <div>
              <p className="text-xs text-gray-500">Notes</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{booking.turo_reason}</p>
            </div>
          ) : null}
        </div>
      )}

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
    </>
  );
}
