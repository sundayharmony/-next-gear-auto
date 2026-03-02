import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/context/auth-context";
import { BookingProvider } from "@/lib/context/booking-context";
import { NotificationProvider } from "@/lib/context/notification-context";
import { NotificationToasts } from "@/components/layout/notification-toasts";
import { LayoutShell } from "@/components/layout/layout-shell";

export const metadata: Metadata = {
  title: {
    default: "NextGearAuto | Premium Car Rentals",
    template: "%s | NextGearAuto",
  },
  description:
    "Premium car rentals at competitive prices. Choose from our well-maintained fleet of compact cars, sedans, SUVs, and trucks.",
  keywords: ["car rental", "vehicle rental", "NextGearAuto", "rent a car", "SUV rental", "truck rental"],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://nextgearauto.com",
    siteName: "NextGearAuto",
    title: "NextGearAuto | Premium Car Rentals",
    description: "Premium car rentals at competitive prices. Choose from our well-maintained fleet.",
  },
  twitter: {
    card: "summary_large_image",
    title: "NextGearAuto | Premium Car Rentals",
    description: "Premium car rentals at competitive prices.",
  },
  robots: {
    index: true,
    follow: true,
  },
  metadataBase: new URL("https://nextgearauto.com"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
          <BookingProvider>
            <NotificationProvider>
              <LayoutShell>{children}</LayoutShell>
              <NotificationToasts />
            </NotificationProvider>
          </BookingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
