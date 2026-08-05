import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Rental Agreement",
  description: "Sign your NextGearAuto rental agreement.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function BookingAgreementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
