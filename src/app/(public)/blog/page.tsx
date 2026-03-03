import React from "react";
import Link from "next/link";
import { Calendar, User, ArrowRight, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import posts from "@/data/blog.json";

export const metadata = {
  title: "Blog",
  description: "Tips, guides, and news from NextGearAuto about car rentals and travel.",
};

export default function BlogPage() {
  const categories = Array.from(new Set(posts.map((p) => p.category)));

  return (
    <>
      <section className="bg-gradient-to-br from-purple-900 to-gray-900 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold">Blog</h1>
          <p className="mt-2 text-lg text-purple-200">Tips, guides, and news about car rentals and travel.</p>
        </div>
      </section>

      <PageContainer className="py-8">
        {/* Category filters */}
        <div className="mb-8 flex flex-wrap gap-2">
          <Badge className="bg-purple-600 text-white cursor-pointer">All Posts</Badge>
          {categories.map((cat) => (
            <Badge key={cat} variant="secondary" className="cursor-pointer hover:bg-gray-200">
              {cat}
            </Badge>
          ))}
        </div>

        {/* Featured post */}
        {posts.length > 0 && (
          <Link href={`/blog/${posts[0].slug}`} className="block mb-8">
            <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="aspect-[16/9] bg-gradient-to-br from-purple-100 to-gray-100 flex items-center justify-center">
                  <Tag className="h-16 w-16 text-purple-300" />
                </div>
                <CardContent className="p-6 flex flex-col justify-center">
                  <Badge className="w-fit mb-3">{posts[0].category}</Badge>
                  <h2 className="text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                    {posts[0].title}
                  </h2>
                  <p className="mt-2 text-gray-500 line-clamp-3">{posts[0].excerpt}</p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> {posts[0].author}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(posts[0].publishedAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </div>
            </Card>
          </Link>
        )}

        {/* Post grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.slice(1).map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`}>
              <Card className="group h-full transition-shadow hover:shadow-lg">
                <div className="aspect-[16/9] bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center rounded-t-xl">
                  <Tag className="h-10 w-10 text-gray-300" />
                </div>
                <CardContent className="p-5">
                  <Badge variant="secondary" className="mb-2">{post.category}</Badge>
                  <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 line-clamp-2">{post.excerpt}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                    <span>{post.author}</span>
                    <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </PageContainer>
    </>
  );
}
