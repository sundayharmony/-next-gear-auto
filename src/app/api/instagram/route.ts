import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";

// Fetch thumbnail from Instagram post by scraping og:image meta tag
async function fetchThumbnail(postUrl: string): Promise<{
  thumbnail_url: string | null;
  title: string | null;
  media_type: string;
}> {
  const media_type = postUrl.includes("/reel") ? "video" : "image";
  try {
    // Clean URL — remove query params and ensure trailing slash
    let cleanUrl = postUrl.split("?")[0];
    if (!cleanUrl.endsWith("/")) cleanUrl += "/";

    const res = await fetch(cleanUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        Accept: "text/html",
      },
      redirect: "follow",
    });

    if (!res.ok) return { thumbnail_url: null, title: null, media_type };

    const html = await res.text();

    // Extract og:image
    const ogImageMatch = html.match(
      /property="og:image"\s+content="([^"]+)"/
    );
    let thumbnail_url: string | null = null;
    if (ogImageMatch?.[1]) {
      // Decode HTML entities (&amp; -> &)
      thumbnail_url = ogImageMatch[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"');
    }

    // Extract og:title or description for caption
    const ogTitleMatch = html.match(
      /property="og:title"\s+content="([^"]+)"/
    );
    const title = ogTitleMatch?.[1]
      ? ogTitleMatch[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"')
      : null;

    return { thumbnail_url, title, media_type };
  } catch (err) {
    logger.error("Instagram thumbnail fetch failed:", err);
    return { thumbnail_url: null, title: null, media_type };
  }
}

// GET: Return all Instagram posts (public)
export async function GET() {
  const supabase = getServiceSupabase();
  try {
    const { data, error } = await supabase
      .from("instagram_posts")
      .select("*")
      .eq("is_visible", true)
      .order("sort_order", { ascending: true });

    if (error) {
      logger.error("Instagram posts fetch error:", error);
      return NextResponse.json({ data: [], success: true });
    }

    return NextResponse.json({ data: data || [], success: true });
  } catch {
    return NextResponse.json({ data: [], success: true });
  }
}

// POST: Add a new Instagram post URL (admin only)
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const supabase = getServiceSupabase();
  try {
    const body = await req.json();
    const { url, caption } = body;

    if (!url || !url.includes("instagram.com")) {
      return NextResponse.json(
        { success: false, error: "A valid Instagram URL is required" },
        { status: 400 }
      );
    }

    // Fetch thumbnail from Instagram page OG tags
    const meta = await fetchThumbnail(url.trim());

    // Get current max sort_order
    const { data: existing } = await supabase
      .from("instagram_posts")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1;

    const id = `ig_${Date.now()}`;
    const { error } = await supabase.from("instagram_posts").insert({
      id,
      url: url.trim(),
      caption: caption?.trim() || meta.title || null,
      thumbnail_url: meta.thumbnail_url,
      media_type: meta.media_type,
      sort_order: nextOrder,
      is_visible: true,
    });

    if (error) {
      logger.error("Instagram post insert error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to add post" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id, thumbnail_url: meta.thumbnail_url },
    }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}

// PATCH: Refresh thumbnail for a post (admin only)
export async function PATCH(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const supabase = getServiceSupabase();
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "id is required" },
        { status: 400 }
      );
    }

    // Get the post URL
    const { data: post } = await supabase
      .from("instagram_posts")
      .select("url")
      .eq("id", id)
      .single();

    if (!post) {
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 }
      );
    }

    // Re-fetch thumbnail
    const meta = await fetchThumbnail(post.url);
    if (meta.thumbnail_url) {
      await supabase
        .from("instagram_posts")
        .update({
          thumbnail_url: meta.thumbnail_url,
          media_type: meta.media_type,
        })
        .eq("id", id);
    }

    return NextResponse.json({
      success: true,
      data: { thumbnail_url: meta.thumbnail_url },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to refresh" },
      { status: 400 }
    );
  }
}

// DELETE: Remove an Instagram post (admin only)
export async function DELETE(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const supabase = getServiceSupabase();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { success: false, error: "id is required" },
      { status: 400 }
    );
  }

  try {
    const { error } = await supabase.from("instagram_posts").delete().eq("id", id);

    if (error) {
      logger.error("Instagram post delete error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to delete post" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to delete post" },
      { status: 400 }
    );
  }
}
