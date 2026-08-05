import type { MetadataRoute } from "next";
import { getCanonicalSiteUrl } from "@/lib/constants";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";

async function fetchPublishedVehicleSitemapEntries(
  baseUrl: string
): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, updated_at, created_at")
      .eq("is_published", true)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error || !data?.length) {
      if (error) logger.error("Sitemap vehicle fetch error:", error);
      return [];
    }

    return data.map((row) => ({
      url: `${baseUrl}/fleet/${row.id}`,
      lastModified: new Date(String(row.updated_at || row.created_at || Date.now())),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch (err) {
    logger.error("Sitemap vehicle fetch error:", err);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getCanonicalSiteUrl();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/fleet`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/fleet/comparison`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/booking`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/location`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/instagram`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const vehiclePages = await fetchPublishedVehicleSitemapEntries(baseUrl);
  return [...staticPages, ...vehiclePages];
}
