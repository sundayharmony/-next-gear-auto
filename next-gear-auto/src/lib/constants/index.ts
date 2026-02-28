import type { NavItem } from "@/lib/types";

export const SITE_NAME = "NextGearAuto";
export const SITE_DESCRIPTION = "Premium car rentals at competitive prices. Choose from our well-maintained fleet of compact cars, sedans, SUVs, and trucks.";
export const SITE_URL = "https://nextgearauto.com";

export const CONTACT_INFO = {
  phone: "(555) 123-RENT",
  email: "info@nextgearauto.com",
  address: "1234 Auto Drive, Suite 100",
  city: "Los Angeles",
  state: "CA",
  zip: "90001",
  hours: {
    weekday: "8:00 AM - 6:00 PM",
    saturday: "9:00 AM - 5:00 PM",
    sunday: "10:00 AM - 4:00 PM",
  },
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Fleet", href: "/fleet" },
  { label: "About", href: "/about" },
  { label: "Location", href: "/location" },
  { label: "Blog", href: "/blog" },
  { label: "FAQ", href: "/faq" },
];

export const VEHICLE_CATEGORIES = [
  { value: "all", label: "All Vehicles" },
  { value: "compact", label: "Compact/Economy" },
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV" },
  { value: "truck", label: "Truck/Pickup" },
] as const;

export const DEPOSIT_AMOUNT = 50;
export const TAX_RATE = 0.08;
export const MIN_RENTAL_AGE = 18;
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const BRAND_COLORS = {
  primary: "#7C3AED",
  primaryDark: "#5B21B6",
  accent: "#A78BFA",
  primaryLight: "#EDE9FE",
  neutral: "#111827",
  gray: "#6B7280",
  background: "#FAFAFA",
  surface: "#FFFFFF",
  error: "#EF4444",
  success: "#10B981",
  warning: "#F59E0B",
} as const;
