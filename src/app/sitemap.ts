import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rentnextgearauto.com";

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date("2026-03-01"),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/fleet`,
      lastModified: new Date("2026-03-01"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/booking`,
      lastModified: new Date("2026-03-01"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date("2026-02-15"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/location`,
      lastModified: new Date("2026-02-15"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date("2026-02-20"),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date("2026-02-15"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date("2026-01-01"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date("2026-01-01"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const vehiclePages: MetadataRoute.Sitemap = ["v1", "v2", "v3", "v4", "v5", "v6"].map((id) => ({
    url: `${baseUrl}/fleet/${id}`,
    lastModified: new Date("2026-03-01"),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...vehiclePages];
}
