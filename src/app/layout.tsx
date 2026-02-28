import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { AuthProvider } from "@/lib/context/auth-context";
import { BookingProvider } from "@/lib/context/booking-context";
import { NotificationProvider } from "@/lib/context/notification-context";
import { ToastContainer, ToastNotification } from "@/components/ui/toast";
import { NotificationToasts } from "@/components/layout/notification-toasts";

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
    siteName: "NextGearAuto",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
          <BookingProvider>
            <NotificationProvider>
              <Header />
              <div className="flex-1">{children}</div>
              <Footer />
              <NotificationToasts />
            </NotificationProvider>
          </BookingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
