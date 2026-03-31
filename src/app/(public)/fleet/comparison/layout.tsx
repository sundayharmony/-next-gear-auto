import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Vehicles | NextGearAuto",
  description: "Compare our vehicles side by side to find the perfect rental for your needs. View specifications, pricing, and features.",
};

export default function ComparisonLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
