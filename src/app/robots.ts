import type { MetadataRoute } from "next";
import { getCanonicalSiteUrl } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getCanonicalSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/account",
        "/account/",
        "/api",
        "/api/",
        "/owner",
        "/owner/",
        "/manager",
        "/manager/",
        "/staff",
        "/login",
        "/signup",
        "/set-password",
        "/reset-password",
        "/booking/success",
        "/booking/cancel",
        "/booking/agreement",
        "/week-to-week-contract",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
