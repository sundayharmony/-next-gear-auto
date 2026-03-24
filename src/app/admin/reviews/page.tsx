"use client";

import React, { useEffect, useState } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { Star, Trash2, CheckCircle, XCircle, RefreshCw, Filter, Loader2, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { logger } from "@/lib/utils/logger";
import { useAutoToast } from "@/lib/hooks/useAutoToast";

interface Review {
  id: string;
  customerId: string;
  customerName: string;
  vehicleId: string;
  rating: number;
  text: string;
  status: string;
  createdAt: string;
}

const STATUS_OPTIONS = ["all", "pending", "approved", "rejected"];

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const { error, setError } = useAutoToast();

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/reviews?admin=true&status=${filter}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) setReviews(data.data);
    } catch (err) {
      logger.error("Failed to fetch reviews:", err);
      setError("Failed to load reviews");
    }
    setLoading(false);
  };

  useEffect(() => { fetchReviews(); }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      const res = await adminFetch("/api/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        setReviews((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
      } else {
        setError(data.error || "Failed to update review");
      }
    } catch {
      setError("Network error — could not update review");
    }
    setUpdating(null);
  };

  const deleteReview = async (id: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;
    try {
      const res = await adminFetch(`/api/reviews?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setReviews((prev) => prev.filter((r) => r.id !== id));
      } else {
        setError(data.error || "Failed to delete review");
      }
    } catch {
      setError("Network error — could not delete review");
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
    };
    return <Badge className={styles[status] || "bg-gray-100 text-gray-700"}>{status}</Badge>;
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`h-3.5 w-3.5 ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
      ))}
    </div>
  );

  const pendingCount = reviews.filter((r) => r.status === "pending").length;

  return (
    <>
      <section className="bg-gradient-to-br from-gray-900 to-purple-900 py-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Reviews</h1>
              <p className="mt-1 text-purple-200">
                {reviews.length} reviews{pendingCount > 0 ? ` · ${pendingCount} pending` : ""}
              </p>
            </div>
          </div>
        </div>
      </section>

      <PageContainer className="py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss error" className="text-red-400 hover:text-red-600 ml-3">&times;</button>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === s
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={fetchReviews} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {/* Reviews List */}
        {loading ? (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 text-purple-600 animate-spin" />
              <span className="text-gray-400">Loading reviews...</span>
            </div>
          </Card>
        ) : reviews.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center justify-center gap-3">
              <MessageSquare className="h-8 w-8 text-gray-300" />
              <span className="text-gray-400">No reviews found.</span>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">{r.customerName}</span>
                      {renderStars(r.rating)}
                      {statusBadge(r.status)}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{r.text}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>Vehicle: {r.vehicleId}</span>
                      <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {r.status !== "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-green-600"
                        onClick={() => updateStatus(r.id, "approved")}
                        disabled={updating === r.id}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" /> Approve
                      </Button>
                    )}
                    {r.status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-orange-600"
                        onClick={() => updateStatus(r.id, "rejected")}
                        disabled={updating === r.id}
                      >
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-red-600"
                      onClick={() => deleteReview(r.id)}
                      disabled={updating === r.id}
                      aria-label="Delete review"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </PageContainer>
    </>
  );
}
