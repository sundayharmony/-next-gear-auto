import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Calendar, User, Tag, ArrowRight, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { generateArticleSchema } from "@/lib/utils/schema-generators";
import { SITE_URL } from "@/lib/constants";
import posts from "@/data/blog.json";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: `${SITE_URL}/blog/${post.slug}`,
    },
    openGraph: {
      title: `${post.title} | NextGearAuto Blog`,
      description: post.excerpt,
      url: `${SITE_URL}/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt,
      authors: [post.author],
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);

  if (!post) notFound();

  const relatedPosts = posts.filter((p) => p.category === post.category && p.id !== post.id).slice(0, 2);

  const articleSchema = generateArticleSchema({
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    author: post.author,
    publishedAt: post.publishedAt,
    category: post.category,
    featuredImage: post.featuredImage,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <section className="bg-gradient-to-br from-purple-900 to-gray-900 py-12 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { label: "Blog", href: "/blog" },
              { label: post.title },
            ]}
          />
          <Badge className="mt-4 mb-3 bg-purple-500/20 text-purple-200 border border-purple-400/30">{post.category}</Badge>
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

        {/* Browse Fleet by Category */}
        <div className="mt-10 rounded-xl border border-purple-100 bg-purple-50/50 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Car className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Browse Our Fleet</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">Find the perfect vehicle for your needs:</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/fleet?category=compact">
              <Badge className="cursor-pointer bg-white text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors">Compact Cars</Badge>
            </Link>
            <Link href="/fleet?category=sedan">
              <Badge className="cursor-pointer bg-white text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors">Sedans</Badge>
            </Link>
            <Link href="/fleet?category=suv">
              <Badge className="cursor-pointer bg-white text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors">SUVs</Badge>
            </Link>
            <Link href="/fleet?category=truck">
              <Badge className="cursor-pointer bg-white text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors">Trucks</Badge>
            </Link>
            <Link href="/fleet">
              <Badge className="cursor-pointer bg-purple-600 text-white hover:bg-purple-700 transition-colors">View All</Badge>
            </Link>
          </div>
        </div>

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
