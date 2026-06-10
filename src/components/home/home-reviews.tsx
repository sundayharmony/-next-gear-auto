import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { PublicReview } from "@/lib/reviews/public-reviews";

export function HomeReviews({ reviews }: { reviews: PublicReview[] }) {
  if (reviews.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {reviews.map((review) => (
        <Card key={review.id} className="p-6 card-hover">
          <div className="flex gap-1 mb-3">
            {Array.from({ length: review.rating }).map((_, i) => (
              <Star key={`filled-${review.id}-${i}`} className="h-4 w-4 fill-amber-400 text-amber-400" />
            ))}
            {Array.from({ length: 5 - review.rating }).map((_, i) => (
              <Star key={`empty-${review.id}-${i}`} className="h-4 w-4 text-gray-200" />
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
