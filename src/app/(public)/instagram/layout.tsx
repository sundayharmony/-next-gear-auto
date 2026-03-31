import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Instagram | NextGearAuto",
  description: "Check out our latest Instagram posts and behind-the-scenes content. Follow us for rental tips, vehicle showcases, and customer stories.",
};

export default function InstagramLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
