import { fetchPublicInstagramPosts } from "@/lib/instagram/public-posts";
import { InstagramClient } from "./instagram-client";

/** Server wrapper: seeds visible posts from `instagram_posts` (same source as GET /api/instagram). */
export default async function InstagramPage() {
  const initialPosts = await fetchPublicInstagramPosts();
  return <InstagramClient initialPosts={initialPosts} />;
}
