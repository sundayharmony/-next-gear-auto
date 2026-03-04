"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Instagram, ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/page-container";

interface InstaPost {
  id: string;
  url: string;
  caption?: string;
  created_at: string;
}

// Declare the global instgrm type
declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

export default function SocialPage() {
  const [posts, setPosts] = useState<InstaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const scriptLoaded = useRef(false);

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

  // Load Instagram embed script
  useEffect(() => {
    if (posts.length === 0) return;
    if (!scriptLoaded.current) {
      const script = document.createElement("script");
      script.src = "https://www.instagram.com/embed.js";
      script.async = true;
      script.onload = () => {
        scriptLoaded.current = true;
        window.instgrm?.Embeds.process();
      };
      document.body.appendChild(script);
    } else {
      // Re-process embeds when posts change
      setTimeout(() => window.instgrm?.Embeds.process(), 100);
    }
  }, [posts]);

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-t-xl" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <div key={post.id} className="instagram-embed-wrapper">
                <blockquote
                  className="instagram-media"
                  data-instgrm-captioned
                  data-instgrm-permalink={post.url.includes("?") ? post.url : `${post.url}?utm_source=ig_embed`}
                  data-instgrm-version="14"
                  style={{
                    background: "#FFF",
                    border: 0,
                    borderRadius: "12px",
                    boxShadow: "0 0 1px 0 rgba(0,0,0,0.5), 0 1px 10px 0 rgba(0,0,0,0.15)",
                    margin: "0 auto",
                    maxWidth: "540px",
                    minWidth: "280px",
                    padding: 0,
                    width: "100%",
                  }}
                >
                  <div style={{ padding: "16px" }}>
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-purple-600 hover:text-purple-800"
                    >
                      View on Instagram
                    </a>
                  </div>
                </blockquote>
              </div>
            ))}
          </div>
        ) : (
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
