import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Read our latest blog posts about car rentals, travel tips, and vehicle maintenance. Stay informed about rental best practices.",
  robots: {
    index: false,
    follow: true,
  },
};

// Blog route now redirects to Instagram feed page
export default function BlogRedirect() {
  redirect("/instagram");
}
