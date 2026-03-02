import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, User, Tag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import posts from "@/data/blog.json";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);

  if (!post) notFound();

  const relatedPosts = posts.filter((p) => p.category === post.category && p.id !== post.id).slice(0, 2);

  return (
    <>
      <section className="bg-gradient-to-br from-purple-900 to-gray-900 py-12 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-purple-300 hover:text-white transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Blog
          </Link>
          <Badge className="mb-3 bg-purple-500/20 text-purple-200 border border-purple-400/30">{post.category}</Badge>
          <h1 className="text-3xl font-bold sm:text-4xl">{post.title}</h1>
          <div className="mt-4 flex items-center gap-4 text-sm text-purple-200">
            <span className="flex items-center gap-1"><User className="h-4 w-4" /> {post.author}</span>
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(post.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
          </div>
        </div>
      </section>

      <PageContainer narrow className="py-10">
        <article className="prose prose-gray max-w-none">
          <div className="whitespace-pre-line text-gray-600 leading-relaxed text-base">
            {post.content}
          </div>
        </article>

        {/* Related posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-12 border-t pt-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Posts</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {relatedPosts.map((related) => (
                <Link key={related.id} href={`/blog/${related.slug}`}>
                  <Card className="group transition-shadow hover:shadow-md">
                    <CardContent className="p-5">
                      <Badge variant="secondary" className="mb-2">{related.category}</Badge>
                      <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                        {related.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">{related.excerpt}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 rounded-xl bg-purple-50 p-8 text-center">
          <h3 className="text-xl font-bold text-gray-900">Ready to Book Your Next Rental?</h3>
          <p className="mt-2 text-gray-500">Browse our fleet and reserve your vehicle today.</p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/fleet"><Button>View Fleet <ArrowRight className="h-4 w-4" /></Button></Link>
            <Link href="/booking"><Button variant="outline">Book Now</Button></Link>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
