import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Fleet",
  description:
    "Browse our fleet of well-maintained vehicles including compact cars, sedans, SUVs, and trucks. Filter by category or price to find the perfect rental.",
  alternates: {
    canonical: `${SITE_URL}/fleet`,
  },
};

export default function FleetLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
