import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { AuthProvider } from "@/lib/context/auth-context";
import { BookingProvider } from "@/lib/context/booking-context";
import { NotificationProvider } from "@/lib/context/notification-context";
import { NotificationToasts } from "@/components/layout/notification-toasts";
import { LayoutShell } from "@/components/layout/layout-shell";
import { Analytics } from "@vercel/analytics/next";
import { generateOrganizationSchema } from "@/lib/utils/schema-generators";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "NextGearAuto | Premium Car Rentals in Jersey City, NJ",
    template: "%s | NextGearAuto",
  },
  description:
    "Premium car rentals in Jersey City, NJ at competitive prices. Choose from our well-maintained fleet of compact cars, sedans, SUVs, and trucks.",
  keywords: ["car rental", "vehicle rental", "NextGearAuto", "rent a car", "SUV rental", "truck rental", "Jersey City car rental", "NJ car rental"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NextGearAuto",
  },
  icons: {
    icon: [
      { url: "/images/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/images/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/images/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "NextGearAuto",
    images: [
      {
        url: `${SITE_URL}/images/logo.png`,
        width: 1200,
        height: 630,
        alt: "NextGearAuto - Premium Car Rentals",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#7c3aed",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="preconnect" href="https://checkout.stripe.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <script
          type="application/ld+json"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateOrganizationSchema()),
          }}
        />
        <AuthProvider>
          <BookingProvider>
            <NotificationProvider>
              <LayoutShell>{children}</LayoutShell>
              <NotificationToasts />
            </NotificationProvider>
          </BookingProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
