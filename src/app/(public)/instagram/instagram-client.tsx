"use client";

/**
 * Public Instagram feed — connected to admin CRUD via GET /api/instagram (staff POST/PATCH/DELETE).
 * SSR-seeded with `initialPosts`; client fetch refreshes when initial list is empty or on retry.
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, Play, Heart, MessageCircle, ExternalLink, X, Loader2,
} from "lucide-react";
import { Instagram } from "@/components/icons/instagram";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { logger } from "@/lib/utils/logger";
import type { InstagramPost } from "@/lib/instagram/public-posts";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

const INSTAGRAM_HANDLE = "drivenextgearauto";

function getEmbedUrl(url: string) {
  let clean = url.split("?")[0];
  if (!clean.endsWith("/")) clean += "/";
  return clean;
}

export function InstagramClient({ initialPosts }: { initialPosts: InstagramPost[] }) {
  const [posts, setPosts] = useState<InstagramPost[]>(initialPosts);
  const [loading, setLoading] = useState(initialPosts.length === 0);
  const [fetchError, setFetchError] = useState(false);
  const [activePost, setActivePost] = useState<InstagramPost | null>(null);
  const [embedLoading, setEmbedLoading] = useState(false);
  const embedRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (initialPosts.length > 0) return;
    let cancelled = false;
    async function fetchPosts() {
      try {
        const res = await fetch("/api/instagram");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          if (data.success) setPosts(data.data || []);
          setLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          logger.error("Failed to fetch Instagram posts", error);
          setFetchError(true);
          setLoading(false);
        }
      }
    }
    fetchPosts();
    return () => { cancelled = true; };
  }, [initialPosts.length]);

  useEffect(() => {
    return () => {
      const script = document.querySelector('script[src="https://www.instagram.com/embed.js"]');
      if (script) script.remove();
    };
  }, []);

  const loadEmbedScript = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (window.instgrm) {
        resolve();
        return;
      }
      if (scriptLoadedRef.current) {
        let elapsed = 0;
        const check = setInterval(() => {
          elapsed += 100;
          if (window.instgrm) {
            clearInterval(check);
            resolve();
          } else if (elapsed >= 10000) {
            clearInterval(check);
            resolve();
          }
        }, 100);
        return;
      }
      scriptLoadedRef.current = true;
      const script = document.createElement("script");
      script.src = "https://www.instagram.com/embed.js";
      script.async = true;
      script.onload = () => setTimeout(() => resolve(), 200);
      document.body.appendChild(script);
    });
  }, []);

  const openPost = useCallback(
    async (post: InstagramPost) => {
      setActivePost(post);
      setEmbedLoading(true);
      await loadEmbedScript();
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.instgrm?.Embeds.process();
          setEmbedLoading(false);
        }, 300);
      });
    },
    [loadEmbedScript]
  );

  const closeModal = useCallback(() => {
    setActivePost(null);
    setEmbedLoading(false);
  }, []);

  useEffect(() => {
    if (!activePost) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [activePost, closeModal]);

  useEffect(() => {
    if (!activePost) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [activePost]);

  return (
    <>
      <section className="page-hero page-hero--lg text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <Instagram className="h-8 w-8 text-purple-300" />
            <h1 className="text-2xl sm:text-4xl font-bold">Follow the Ride</h1>
          </div>
          <p className="mt-2 text-lg page-hero-subtitle max-w-2xl">
            Check out our latest posts, reels, and behind-the-scenes content from NextGearAuto.
          </p>
          <a
            href={`https://www.instagram.com/${INSTAGRAM_HANDLE}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <Instagram className="h-4 w-4" />@{INSTAGRAM_HANDLE}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>

      <PageContainer className="py-12">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : fetchError ? (
          <div className="text-center py-12">
            <Instagram className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">Unable to load posts right now. Please try again later.</p>
          </div>
        ) : posts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {posts.map((post) => (
              <button
                key={post.id}
                onClick={() => openPost(post)}
                className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100 block w-full text-left cursor-pointer"
                aria-label={post.caption ? `View Instagram post: ${post.caption.substring(0, 60).trim()}${post.caption.length > 60 ? "..." : ""}` : "View Instagram post"}
              >
                {post.thumbnail_url ? (
                  <Image
                    src={post.thumbnail_url}
                    alt={post.caption || "Instagram post"}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, 33vw"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
                    <Instagram className="h-12 w-12 text-purple-300" />
                  </div>
                )}
                {post.media_type === "video" && (
                  <div className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm">
                    <Play className="h-4 w-4 fill-white" />
                  </div>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/40">
                  <div className="flex items-center gap-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <div className="flex items-center gap-1.5 text-white">
                      <Heart className="h-5 w-5 fill-white" />
                    </div>
                    <div className="flex items-center gap-1.5 text-white">
                      <MessageCircle className="h-5 w-5 fill-white" />
                    </div>
                  </div>
                  {post.caption && (
                    <p className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-3 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 line-clamp-2">
                      {post.caption}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-pink-100 via-purple-100 to-indigo-100 mb-6">
              <Instagram className="h-10 w-10 text-purple-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Coming Soon</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              We&apos;re connecting our Instagram feed. In the meantime, follow us for the latest updates.
            </p>
            <a href={`https://www.instagram.com/${INSTAGRAM_HANDLE}/`} target="_blank" rel="noopener noreferrer">
              <Button className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90">
                <Instagram className="h-4 w-4 mr-2" />
                Follow @{INSTAGRAM_HANDLE}
              </Button>
            </a>
          </div>
        )}

        {posts.length > 0 && (
          <div className="mt-12 text-center">
            <a href={`https://www.instagram.com/${INSTAGRAM_HANDLE}/`} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90">
                <Instagram className="h-4 w-4 mr-2" />
                See More on Instagram
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </a>
          </div>
        )}
      </PageContainer>

      {activePost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-gray-100 hover:bg-black/70 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {embedLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 rounded-2xl" role="status" aria-live="polite" aria-label="Loading post">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" aria-hidden="true" />
                  <span className="text-sm text-gray-500">Loading post...</span>
                </div>
              </div>
            )}
            <div ref={embedRef} className="p-2">
              <blockquote
                className="instagram-media"
                data-instgrm-captioned
                data-instgrm-permalink={`${getEmbedUrl(activePost.url)}?utm_source=ig_embed`}
                data-instgrm-version="14"
                style={{
                  background: "#FFF",
                  border: 0,
                  borderRadius: "12px",
                  boxShadow: "none",
                  margin: "0 auto",
                  maxWidth: "540px",
                  minWidth: "280px",
                  padding: 0,
                  width: "100%",
                }}
              >
                <div style={{ padding: "16px" }}>
                  <a href={activePost.url} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-600 hover:text-purple-800">
                    View on Instagram
                  </a>
                </div>
              </blockquote>
            </div>
            <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
              <a href={activePost.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-600 hover:text-purple-800">
                <ExternalLink className="h-3.5 w-3.5" />
                Open on Instagram
              </a>
              <button onClick={closeModal} className="text-sm text-gray-600 hover:text-gray-800">Close</button>
            </div>
          </div>
        </div>
      )}

      <section className="bg-gradient-to-r from-purple-600 to-purple-800 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold">Ready to Hit the Road?</h2>
          <p className="mt-3 text-lg text-purple-100">Browse our fleet and book your next rental today.</p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/fleet">
              <Button size="lg" className="bg-white text-purple-900 hover:bg-gray-100">
                View Our Fleet <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link href="/booking">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                Book Now
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
