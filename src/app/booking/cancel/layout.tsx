import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Booking Cancelled",
  description: "Your NextGearAuto checkout was cancelled.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function BookingCancelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
