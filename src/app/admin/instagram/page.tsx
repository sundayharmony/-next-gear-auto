"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, RefreshCw, Instagram, ExternalLink, X, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/layout/page-container";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { logger } from "@/lib/utils/logger";
import { useAutoToast } from "@/lib/hooks/useAutoToast";

interface InstaPost {
  id: string;
  url: string;
  caption?: string;
  thumbnail_url?: string;
  media_type?: string;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
}

export default function AdminInstagramPage() {
  const [posts, setPosts] = useState<InstaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [adding, setAdding] = useState(false);
  const { error, setError, setSuccess } = useAutoToast();
  const [showForm, setShowForm] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPosts = async () => {
    // Abort previous request if it's still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this fetch
    abortControllerRef.current = new AbortController();
    setLoading(true);
    try {
      const res = await adminFetch("/api/instagram", { signal: abortControllerRef.current.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) setPosts(data.data || []);
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === "AbortError") return;
      logger.error("Failed to fetch posts:", err);
      setError("Failed to load Instagram posts");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
    return () => {
      // Abort fetch on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleAdd = async () => {
    if (!newUrl.trim()) {
      setError("Please enter an Instagram URL.");
      return;
    }
    if (!newUrl.includes("instagram.com")) {
      setError("Please enter a valid Instagram URL (e.g., https://www.instagram.com/p/...).");
      return;
    }

    setAdding(true);
    try {
      const res = await adminFetch("/api/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl.trim(), caption: newCaption.trim() || null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setNewUrl("");
        setNewCaption("");
        setShowForm(false);
        setSuccess("Post added successfully!");
        fetchPosts();
      } else {
        setError(data.error || "Failed to add post");
      }
    } catch {
      setError("Network error — could not add post");
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    const post = posts.find(p => p.id === id);
    const confirmMsg = post ? `Remove this Instagram post from the feed?\n\nURL: ${post.url}${post.caption ? `\nCaption: ${post.caption}` : ""}` : "Remove this Instagram post from the feed?";
    if (!window.confirm(confirmMsg)) return;
    try {
      const res = await adminFetch(`/api/instagram?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      } else {
        setError(data.error || "Failed to delete post");
      }
    } catch {
      setError("Network error — could not delete post");
    }
  };

  return (
    <>
      <section className="bg-gradient-to-br from-gray-900 to-purple-900 py-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-purple-300 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Instagram className="h-6 w-6 text-pink-400" />
                <h1 className="text-3xl font-bold">Instagram Feed</h1>
              </div>
              <p className="mt-1 text-purple-200">Manage the Instagram posts shown on your blog page.</p>
            </div>
          </div>
        </div>
      </section>

      <PageContainer className="py-8">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss error" className="text-red-400 hover:text-red-600">&times;</button>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">{posts.length} post{posts.length !== 1 ? "s" : ""} in feed</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchPosts} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setShowForm(!showForm)} className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white hover:opacity-90">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Post
            </Button>
          </div>
        </div>

        {/* Add Post Form */}
        {showForm && (
          <Card className="mb-6 border-purple-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Instagram className="h-5 w-5 text-pink-500" />
                  Add Instagram Post
                </h3>
                <button onClick={() => setShowForm(false)} aria-label="Close add post form" className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instagram Post or Reel URL <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://www.instagram.com/p/ABC123/ or https://www.instagram.com/reel/ABC123/"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Copy the link from any Instagram post or reel. Supports posts, reels, and carousel posts.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Caption (optional)</label>
                  <Input
                    value={newCaption}
                    onChange={(e) => setNewCaption(e.target.value)}
                    placeholder="Optional note for your reference"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setShowForm(false); setNewUrl(""); setNewCaption(""); }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={adding}
                  className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white hover:opacity-90"
                >
                  {adding ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...</> : "Add to Feed"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Posts Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card className="p-12 text-center">
            <Instagram className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Posts Yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              Add Instagram post or reel URLs to show them on your blog page.
            </p>
            <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white hover:opacity-90">
              <Plus className="h-4 w-4 mr-1" /> Add Your First Post
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {posts.map((post, index) => (
              <Card key={post.id} className="p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                {post.thumbnail_url ? (
                  <div className="relative h-14 w-14 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                    <img src={post.thumbnail_url} alt={`Instagram post ${index + 1}`} loading="lazy" className="h-full w-full object-cover" />
                    {post.media_type === "video" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <span className="text-white text-xs font-bold">▶</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-r from-pink-100 via-purple-100 to-indigo-100 text-sm font-bold text-purple-600 shrink-0">
                    {index + 1}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={post.url}
                    className="text-sm text-purple-600 hover:text-purple-800 font-medium truncate block"
                  >
                    {post.url}
                    <ExternalLink className="inline h-3 w-3 ml-1" />
                  </a>
                  {post.caption && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{post.caption}</p>
                  )}
                  <p className="text-xs text-gray-300 mt-0.5">
                    Added {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 hover:text-red-700 shrink-0"
                  onClick={() => handleDelete(post.id)}
                  aria-label={`Delete post ${index + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </PageContainer>
    </>
  );
}
