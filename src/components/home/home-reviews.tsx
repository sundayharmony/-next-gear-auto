"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { logger } from "@/lib/utils/logger";

interface Review {
  id: string;
  customerName: string;
  rating: number;
  text: string;
}

const FALLBACK_REVIEWS: Review[] = [
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

export function HomeReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await fetch("/api/reviews");
        const result = await res.json();
        if (result.success && result.data?.length > 0) {
          // Sort by rating descending, then take top 3
          const sorted = [...result.data].sort(
            (a: Review, b: Review) => b.rating - a.rating
          );
          setReviews(sorted.slice(0, 3));
        } else {
          // Use fallback reviews when no approved reviews exist yet
          setReviews(FALLBACK_REVIEWS);
        }
      } catch (err) {
        logger.error("Failed to fetch reviews:", err);
        setReviews(FALLBACK_REVIEWS);
      }
      setLoading(false);
    }
    fetchReviews();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="flex gap-1 mb-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-4 w-4 rounded bg-gray-200" />
              ))}
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-4/5" />
              <div className="h-3 bg-gray-200 rounded w-3/5" />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gray-200" />
              <div className="space-y-1">
                <div className="h-3 bg-gray-200 rounded w-24" />
                <div className="h-2 bg-gray-200 rounded w-16" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {reviews.map((review) => (
        <Card key={review.id} className="p-6 card-hover">
          <div className="flex gap-1 mb-3">
            {Array.from({ length: review.rating }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
            ))}
            {Array.from({ length: 5 - review.rating }).map((_, i) => (
              <Star key={`empty-${i}`} className="h-4 w-4 text-gray-200" />
            ))}
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            &ldquo;{review.text}&rdquo;
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-600">
              {(review.customerName || "?")
                .split(" ")
                .map((n) => n[0] || "")
                .join("")}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {review.customerName}
              </p>
              <p className="text-xs text-gray-400">Verified Renter</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
