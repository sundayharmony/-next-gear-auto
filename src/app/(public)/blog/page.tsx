import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Blog | NextGearAuto",
  description: "Read our latest blog posts about car rentals, travel tips, and vehicle maintenance. Stay informed about rental best practices.",
};

// Blog route now redirects to Instagram feed page
export default function BlogRedirect() {
  redirect("/instagram");
}
