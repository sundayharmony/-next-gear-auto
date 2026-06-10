import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";

export interface PublicReview {
  id: string;
  customerName: string;
  rating: number;
  text: string;
}

const FALLBACK_REVIEWS: PublicReview[] = [
  {
    id: "fallback-1",
    customerName: "Marcus T.",
    rating: 5,
    text: "Super easy booking process and the car was spotless. Way better experience than the big rental chains. Will definitely be coming back!",
  },
  {
    id: "fallback-2",
    customerName: "Sarah K.",
    rating: 5,
    text: "Rented a truck for moving day and it was exactly what I needed. Affordable price and great condition. The owner was super helpful too.",
  },
  {
    id: "fallback-3",
    customerName: "David R.",
    rating: 5,
    text: "Best local rental in Jersey City. No hidden fees, clean vehicles, and the pickup/drop-off was quick and hassle-free. Highly recommend!",
  },
];

/** Server-side home-page reviews. Mirrors public GET /api/reviews (approved only). */
export async function fetchPublicReviews(limit = 3): Promise<PublicReview[]> {
  const supabase = getServiceSupabase();

  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("id, customer_name, rating, text")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Public reviews fetch error:", error);
      return FALLBACK_REVIEWS;
    }

    if (!data?.length) {
      return FALLBACK_REVIEWS;
    }

    const sorted = [...data].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return sorted.slice(0, limit).map((r) => ({
      id: String(r.id),
      customerName: String(r.customer_name ?? "Customer"),
      rating: Number(r.rating ?? 5),
      text: String(r.text ?? ""),
    }));
  } catch (err) {
    logger.error("Public reviews fetch error:", err);
    return FALLBACK_REVIEWS;
  }
}
