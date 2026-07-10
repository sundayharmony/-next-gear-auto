"use client";

import { AdminCard, AdminSection } from "@/components/admin/admin-shell";
import type { CustomerBookingRow, CustomerStats } from "../customer-detail-types";

export function CustomerRiskCard({
  stats,
  bookings,
}: {
  stats: CustomerStats;
  bookings: CustomerBookingRow[];
}) {
  if (stats.totalBookings === 0) return null;

  const rate = stats.cancelledTrips / stats.totalBookings;
  const pct = Math.round(rate * 100);
  const barColor = rate > 0.3 ? "bg-red-500" : rate > 0.15 ? "bg-yellow-500" : "bg-green-500";
  const textColor = rate > 0.3 ? "text-red-600" : rate > 0.15 ? "text-yellow-600" : "text-green-600";
  const noShows = bookings.filter((b) => b.status === "no-show").length;

  return (
    <AdminSection title="Risk assessment">
      <AdminCard>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Cancellation rate</span>
            <span className={`font-bold ${textColor}`}>{pct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          <div className="flex justify-between items-center pt-1">
            <span className="text-gray-600">No-shows</span>
            <span className="font-bold text-gray-900">{noShows}</span>
          </div>
        </div>
      </AdminCard>
    </AdminSection>
  );
}
