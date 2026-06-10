import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";

export interface InstagramPost {
  id: string;
  url: string;
  caption?: string | null;
  thumbnail_url?: string | null;
  media_type?: string | null;
  created_at: string;
}

/** Server-side fetch for public Instagram page. Mirrors GET /api/instagram. */
export async function fetchPublicInstagramPosts(): Promise<InstagramPost[]> {
  const supabase = getServiceSupabase();
  try {
    const { data, error } = await supabase
      .from("instagram_posts")
      .select("*")
      .eq("is_visible", true)
      .order("sort_order", { ascending: true })
      .limit(500);

    if (error) {
      logger.error("Instagram posts fetch error:", error);
      return [];
    }

    return (data || []) as InstagramPost[];
  } catch (err) {
    logger.error("Instagram posts fetch error:", err);
    return [];
  }
}
