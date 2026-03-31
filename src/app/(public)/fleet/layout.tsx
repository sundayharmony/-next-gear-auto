import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fleet | NextGearAuto",
  description: "Browse our fleet of well-maintained vehicles including compact cars, sedans, SUVs, and trucks. Filter by category or price to find the perfect rental.",
};

export default function FleetLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
