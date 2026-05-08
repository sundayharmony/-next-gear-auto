import React from "react";
import { WeekToWeekContractPageClient } from "@/components/week-to-week-contract-page-client";

export const metadata = {
  title: "Week-to-Week Long-Term Rental Contract",
  description:
    "Special recurring week-to-week rental contract for long-term renters who rebook every week.",
};

export default function WeekToWeekContractPage() {
  return (
    <WeekToWeekContractPageClient />
  );
}
