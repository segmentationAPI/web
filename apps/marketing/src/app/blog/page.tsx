import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";

import { GlassCard } from "@/components/marketing-primitives";
import { formatBlogDate, getAllBlogPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog | SegmentationAPI",
  description:
    "Product notes, implementation guides, and segmentation engineering articles from SegmentationAPI.",
};

export default async function BlogIndexPage() {
  const posts = await getAllBlogPosts();

  return (
    <main className="mx-auto flex w-full max-w-300 flex-col gap-10 px-4 pt-8 pb-24 sm:px-8 sm:pt-12">
      <section className="reveal max-w-3xl space-y-5">
        <div className="space-y-4">
          <h1 className="font-display text-4xl leading-[1.05] tracking-[-0.04em] sm:text-6xl">
            Segmentation notes for teams shipping visual AI.
          </h1>
          <p className="text-muted-foreground max-w-2xl text-base leading-[1.75] lg:text-lg">
            Practical guidance on SAM 3, production segmentation workflows, and the API patterns
            behind reliable mask generation.
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Blog posts">
        {posts.map((post, index) => (
          <Link key={post.slug} href={post.href} className="group">
            <GlassCard
              className="group-hover:border-secondary/55 reveal h-full rounded-2xl p-5 shadow-none transition-colors duration-200 sm:p-6"
              style={{ animationDelay: `${180 + index * 80}ms` }}
            >
              <article className="flex h-full flex-col gap-5">
                <div className="text-muted-foreground flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 font-mono text-[0.7rem] tracking-[0.14em] uppercase">
                    <CalendarDays className="text-primary h-3.5 w-3.5" />
                    {formatBlogDate(post.metadata.publishedAt)}
                  </span>
                  {post.metadata.tags.map((tag) => (
                    <span
                      key={tag}
                      className="border-primary/25 bg-primary/10 rounded-full border px-2.5 py-1 font-mono text-[0.62rem] tracking-[0.12em] uppercase"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="space-y-3">
                  <h2 className="font-display text-2xl leading-[1.08] tracking-[-0.03em] sm:text-3xl">
                    {post.metadata.title}
                  </h2>
                  <p className="text-muted-foreground text-sm leading-[1.7]">
                    {post.metadata.description}
                  </p>
                </div>
                <span className="text-secondary mt-auto inline-flex items-center gap-2 font-mono text-[0.68rem] tracking-[0.15em] uppercase">
                  Read article
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </article>
            </GlassCard>
          </Link>
        ))}
      </section>
    </main>
  );
}
