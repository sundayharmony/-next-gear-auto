import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Compare Vehicles",
  description:
    "Compare our vehicles side by side to find the perfect rental for your needs. View specifications, pricing, and features.",
  alternates: {
    canonical: `${SITE_URL}/fleet/comparison`,
  },
};

export default function ComparisonLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
