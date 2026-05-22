import React from "react";
import { Suspense } from "react";
import { WeekToWeekContractPageClient } from "@/components/week-to-week-contract-page-client";

export const metadata = {
  title: "Week-to-Week Long-Term Rental Contract",
  description:
    "Week-to-week long-term rental contract (admin/manager access). Open from a recurring booking in the bookings panel.",
};

export default function WeekToWeekContractPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-gray-500">
          Loading week-to-week contract...
        </div>
      }
    >
      <WeekToWeekContractPageClient />
    </Suspense>
  );
}
