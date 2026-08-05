import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Instagram",
  description:
    "Check out our latest Instagram posts and behind-the-scenes content. Follow us for rental tips, vehicle showcases, and customer stories.",
  alternates: {
    canonical: `${SITE_URL}/instagram`,
  },
};

export default function InstagramLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
