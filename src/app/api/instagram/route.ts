import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";

// Fetch thumbnail and metadata from Instagram's oEmbed API
async function fetchOEmbed(postUrl: string) {
  try {
    const oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(postUrl)}&maxwidth=640&omitscript=true`;
    const res = await fetch(oembedUrl, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      thumbnail_url: data.thumbnail_url || null,
      title: data.title || null,
      author_name: data.author_name || null,
      media_type: postUrl.includes("/reel") ? "video" : "image",
    };
  } catch (err) {
    console.error("oEmbed fetch failed:", err);
    return null;
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
      console.error("Instagram posts fetch error:", error);
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

    // Fetch thumbnail from Instagram oEmbed
    const oembed = await fetchOEmbed(url.trim());

    // Get current max sort_order
    const { data: existing } = await supabase
      .from("instagram_posts")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.sort_order || 0) + 1;

    const id = `ig_${Date.now()}`;
    const { error } = await supabase.from("instagram_posts").insert({
      id,
      url: url.trim(),
      caption: caption?.trim() || oembed?.title || null,
      thumbnail_url: oembed?.thumbnail_url || null,
      media_type: oembed?.media_type || "image",
      sort_order: nextOrder,
      is_visible: true,
    });

    if (error) {
      console.error("Instagram post insert error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to add post" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id, thumbnail_url: oembed?.thumbnail_url },
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

    // Re-fetch oEmbed data
    const oembed = await fetchOEmbed(post.url);
    if (oembed?.thumbnail_url) {
      await supabase
        .from("instagram_posts")
        .update({ thumbnail_url: oembed.thumbnail_url })
        .eq("id", id);
    }

    return NextResponse.json({
      success: true,
      data: { thumbnail_url: oembed?.thumbnail_url },
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
      console.error("Instagram post delete error:", error);
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
