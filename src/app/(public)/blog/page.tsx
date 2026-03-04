"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Instagram, ArrowRight, Play, Heart, MessageCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";

interface InstaPost {
  id: string;
  url: string;
  caption?: string;
  thumbnail_url?: string;
  media_type?: string;
  created_at: string;
}

export default function SocialPage() {
  const [posts, setPosts] = useState<InstaPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch("/api/instagram");
        const data = await res.json();
        if (data.success) {
          setPosts(data.data || []);
        }
      } catch {
        console.error("Failed to fetch Instagram posts");
      }
      setLoading(false);
    }
    fetchPosts();
  }, []);

  const INSTAGRAM_HANDLE = "drivenextgearauto";

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-purple-900 to-gray-900 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <Instagram className="h-8 w-8 text-purple-300" />
            <h1 className="text-4xl font-bold">Follow the Ride</h1>
          </div>
          <p className="mt-2 text-lg text-purple-200 max-w-2xl">
            Check out our latest posts, reels, and behind-the-scenes content from NextGearAuto.
          </p>
          <a
            href={`https://www.instagram.com/${INSTAGRAM_HANDLE}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <Instagram className="h-4 w-4" />
            @{INSTAGRAM_HANDLE}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>

      <PageContainer className="py-12">
        {loading ? (
          /* Loading skeleton grid */
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {posts.map((post) => (
              <a
                key={post.id}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100 block"
              >
                {/* Thumbnail image */}
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

                {/* Reel/Video play icon */}
                {post.media_type === "video" && (
                  <div className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm">
                    <Play className="h-4 w-4 fill-white" />
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/40">
                  <div className="flex items-center gap-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <div className="flex items-center gap-1.5 text-white">
                      <Heart className="h-5 w-5 fill-white" />
                    </div>
                    <div className="flex items-center gap-1.5 text-white">
                      <MessageCircle className="h-5 w-5 fill-white" />
                    </div>
                  </div>
                  {/* Caption preview on hover */}
                  {post.caption && (
                    <p className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-3 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 line-clamp-2">
                      {post.caption}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="text-center py-16">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-pink-100 via-purple-100 to-indigo-100 mb-6">
              <Instagram className="h-10 w-10 text-purple-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Coming Soon</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              We&apos;re connecting our Instagram feed. In the meantime, follow us for the latest updates, behind-the-scenes content, and customer stories.
            </p>
            <a
              href={`https://www.instagram.com/${INSTAGRAM_HANDLE}/`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90">
                <Instagram className="h-4 w-4 mr-2" />
                Follow @{INSTAGRAM_HANDLE}
              </Button>
            </a>
          </div>
        )}

        {/* Follow CTA */}
        {posts.length > 0 && (
          <div className="mt-12 text-center">
            <a
              href={`https://www.instagram.com/${INSTAGRAM_HANDLE}/`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90">
                <Instagram className="h-4 w-4 mr-2" />
                See More on Instagram
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </a>
          </div>
        )}
      </PageContainer>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-purple-600 to-purple-800 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold">Ready to Hit the Road?</h2>
          <p className="mt-3 text-lg text-purple-100">
            Browse our fleet and book your next rental today.
          </p>
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
