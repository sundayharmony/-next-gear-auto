import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://rentnextgearauto.com";

  const staticPages = [
    "",
    "/fleet",
    "/about",
    "/location",
    "/blog",
    "/faq",
    "/booking",
    "/login",
    "/signup",
    "/privacy",
    "/terms",
  ];

  const vehicleIds = ["v1", "v2", "v3", "v4", "v5", "v6"];
  const blogSlugs = ["road-trip-planning-guide", "how-to-choose-rental-car", "understanding-rental-insurance"];

  return [
    ...staticPages.map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.8,
    })),
    ...vehicleIds.map((id) => ({
      url: `${baseUrl}/fleet/${id}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...blogSlugs.map((slug) => ({
      url: `${baseUrl}/blog/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
