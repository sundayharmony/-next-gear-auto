"use client";

import { BookingRow } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { CarFront, CalendarCheck, AlertTriangle } from "lucide-react";

interface TodaySummaryProps {
  todayPickups: BookingRow[];
  todayReturns: BookingRow[];
  overdueBookings: BookingRow[];
  onSelectBooking: (booking: BookingRow) => void;
}

interface SummaryCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count: number;
  accentColor: string;
  items: BookingRow[];
  showCard: boolean;
  onSelectBooking: (booking: BookingRow) => void;
}

const SummaryCard = ({
  icon: Icon,
  title,
  count,
  accentColor,
  items,
  showCard,
  onSelectBooking,
}: SummaryCardProps) => {
  if (!showCard) return null;

  const displayItems = items.slice(0, 3);
  const moreCount = Math.max(0, items.length - 3);

  return (
    <Card className="border-l-4" style={{ borderLeftColor: accentColor }}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div style={{ color: accentColor }}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
            </div>
            <p className="text-2xl font-bold mb-3">{count}</p>

            {displayItems.length > 0 && (
              <div className="space-y-1">
                {displayItems.map((booking) => (
                  <button
                    key={booking.id}
                    onClick={() => onSelectBooking(booking)}
                    className="block text-xs text-blue-600 hover:underline text-left truncate"
                  >
                    {booking.customer_name}
                  </button>
                ))}
                {moreCount > 0 && (
                  <button
                    onClick={() => {
                      // Could emit event or filter here
                    }}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                  >
                    +{moreCount} more
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export function TodaySummary({
  todayPickups,
  todayReturns,
  overdueBookings,
  onSelectBooking,
}: TodaySummaryProps) {
  // Don't render if all are empty
  if (
    todayPickups.length === 0 &&
    todayReturns.length === 0 &&
    overdueBookings.length === 0
  ) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <SummaryCard
        icon={CarFront}
        title="Today's Pickups"
        count={todayPickups.length}
        accentColor="#10b981"
        items={todayPickups}
        showCard={true}
        onSelectBooking={onSelectBooking}
      />
      <SummaryCard
        icon={CalendarCheck}
        title="Today's Returns"
        count={todayReturns.length}
        accentColor="#3b82f6"
        items={todayReturns}
        showCard={true}
        onSelectBooking={onSelectBooking}
      />
      {overdueBookings.length > 0 && (
        <SummaryCard
          icon={AlertTriangle}
          title="Overdue Returns"
          count={overdueBookings.length}
          accentColor="#ef4444"
          items={overdueBookings}
          showCard={true}
          onSelectBooking={onSelectBooking}
        />
      )}
    </div>
  );
}
