import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://nextgearauto.com";

  const staticPages = [
    { url: baseUrl, changeFrequency: "weekly" as const, priority: 1.0 },
    { url: `${baseUrl}/fleet`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${baseUrl}/location`, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${baseUrl}/faq`, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${baseUrl}/blog`, changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${baseUrl}/booking`, changeFrequency: "weekly" as const, priority: 0.9 },
    { url: `${baseUrl}/login`, changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${baseUrl}/signup`, changeFrequency: "monthly" as const, priority: 0.3 },
  ];

  // Vehicle detail pages
  const vehicleIds = ["v1", "v2", "v3", "v4", "v5", "v6"];
  const vehiclePages = vehicleIds.map((id) => ({
    url: `${baseUrl}/fleet/${id}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Blog post pages
  const blogSlugs = [
    "top-road-trip-destinations",
    "choose-right-rental-car",
    "rental-car-insurance-guide",
  ];
  const blogPages = blogSlugs.map((slug) => ({
    url: `${baseUrl}/blog/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    ...staticPages.map((page) => ({
      ...page,
      lastModified: new Date(),
    })),
    ...vehiclePages.map((page) => ({
      ...page,
      lastModified: new Date(),
    })),
    ...blogPages.map((page) => ({
      ...page,
      lastModified: new Date(),
    })),
  ];
}
