"use client";

import React, { useState } from "react";
import { Star, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { csrfFetch } from "@/lib/utils/csrf-fetch";

interface ReviewFormProps {
  vehicleId: string;
  vehicleName: string;
  bookingId?: string;
  customerId?: string;
  customerName?: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function ReviewForm({
  vehicleId,
  vehicleName,
  bookingId,
  customerId,
  customerName: initialName,
  onClose,
  onSubmitted,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [text, setText] = useState("");
  const [customerName, setCustomerName] = useState(initialName || "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!rating) {
      setError("Please select a rating.");
      return;
    }
    if (!text.trim()) {
      setError("Please write a review.");
      return;
    }
    if (!customerName.trim()) {
      setError("Please enter your name.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await csrfFetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          bookingId,
          customerId,
          customerName: customerName.trim(),
          rating,
          text: text.trim(),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to submit review.");
        return;
      }

      setSubmitted(true);
      onSubmitted?.();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <Star className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Thank You!</h3>
        <p className="mt-1 text-sm text-gray-500">
          Your review has been submitted and will appear after approval.
        </p>
        <Button variant="outline" className="mt-4" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Review: {vehicleName}
        </h3>
        <button
          onClick={onClose}
          aria-label="Close review form"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Star rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rating
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                aria-pressed={rating === star}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-7 w-7 ${
                    star <= (hoveredRating || rating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        {!initialName && (
          <div>
            <label
              htmlFor="reviewer-name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Your Name
            </label>
            <input
              id="reviewer-name"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="John Doe"
              maxLength={100}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        )}

        {/* Review text */}
        <div>
          <label
            htmlFor="review-text"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Your Review
          </label>
          <textarea
            id="review-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your experience..."
            maxLength={500}
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
          />
          <p className="mt-1 text-xs text-gray-400">{text.length}/500</p>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <Button
          type="submit"
          disabled={submitting}
          className="w-full gap-2"
        >
          {submitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Submit Review
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
