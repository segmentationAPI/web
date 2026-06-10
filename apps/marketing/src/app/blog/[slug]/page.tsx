import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";

import { ToneChip } from "@/components/marketing-primitives";
import { formatBlogDate, getAllBlogPosts, getBlogPost } from "@/lib/blog";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const posts = await getAllBlogPosts();

  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    return {};
  }

  const { metadata } = post;

  return {
    title: `${metadata.title} | SegmentationAPI Blog`,
    description: metadata.description,
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      type: "article",
      publishedTime: metadata.publishedAt,
      modifiedTime: metadata.updatedAt,
      tags: metadata.tags,
      url: post.href,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const { Component, metadata } = post;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pt-8 pb-24 sm:px-8 sm:pt-12">
      <Link
        href={"/blog" as Route}
        className="reveal text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-2 font-mono text-[0.7rem] tracking-[0.14em] uppercase transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to blog
      </Link>

      <article
        className="reveal border-primary/20 bg-card/80 rounded-[2rem] border px-5 py-7 shadow-[0_24px_70px_rgba(5,7,12,0.5),inset_0_1px_0_rgba(255,255,255,0.04)] sm:px-8 sm:py-10"
        style={{ animationDelay: "140ms" }}
      >
        <header className="border-primary/18 mb-8 flex flex-col gap-4 border-b pb-8">
          <ToneChip className="w-fit">
            <CalendarDays className="h-4 w-4" />
            {formatBlogDate(metadata.publishedAt)}
          </ToneChip>
          <p className="text-muted-foreground max-w-2xl text-base leading-[1.75]">
            {metadata.description}
          </p>
          <div className="flex flex-wrap gap-2">
            {metadata.tags.map((tag) => (
              <span
                key={tag}
                className="border-primary/25 bg-primary/10 text-muted-foreground rounded-full border px-2.5 py-1 font-mono text-[0.62rem] tracking-[0.12em] uppercase"
              >
                {tag}
              </span>
            ))}
          </div>
        </header>

        <div className="blog-mdx text-[0.98rem] sm:text-[1.02rem]">
          <Component />
        </div>
      </article>
    </main>
  );
}
