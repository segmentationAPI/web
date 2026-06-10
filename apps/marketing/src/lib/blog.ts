import { readdirSync } from "node:fs";
import { cacheLife } from "next/cache";
import { cache } from "react";
import type { ComponentType } from "react";
import type { Route } from "next";

const BLOG_CONTENT_DIR = `${process.cwd()}/src/content/blog`;
const BLOG_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type BlogPostMetadata = {
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  tags: string[];
  published: boolean;
};

export type BlogPostSummary = {
  slug: string;
  href: Route;
  metadata: BlogPostMetadata;
};

export type BlogPost = BlogPostSummary & {
  Component: ComponentType;
};

type BlogPostModule = {
  default: ComponentType;
  metadata?: unknown;
};

export function isValidBlogSlug(slug: string): boolean {
  return BLOG_SLUG_PATTERN.test(slug);
}

export function getBlogSlugs(): string[] {
  const slugs = readdirSync(BLOG_CONTENT_DIR)
    .filter((fileName) => fileName.endsWith(".mdx"))
    .map((fileName) => fileName.replace(/\.mdx$/, ""));

  const invalidSlugs = slugs.filter((slug) => !isValidBlogSlug(slug));

  if (invalidSlugs.length > 0) {
    throw new Error(
      `Invalid blog slug(s): ${invalidSlugs.join(", ")}. Use lowercase kebab-case file names.`,
    );
  }

  return slugs.sort();
}

export const getBlogPost = cache(async (slug: string): Promise<BlogPost | null> => {
  if (!isValidBlogSlug(slug) || !getBlogSlugs().includes(slug)) {
    return null;
  }

  const postModule = (await import(`@/content/blog/${slug}.mdx`)) as BlogPostModule;
  const metadata = normalizeBlogMetadata(slug, postModule.metadata);

  if (!metadata.published) {
    return null;
  }

  return {
    slug,
    href: `/blog/${slug}` as Route,
    metadata,
    Component: postModule.default,
  };
});

export async function getAllBlogPosts(): Promise<BlogPostSummary[]> {
  "use cache";
  cacheLife("max");

  const posts = await Promise.all(getBlogSlugs().map((slug) => getBlogPost(slug)));

  return posts
    .filter((post): post is BlogPost => post !== null)
    .map((post) => ({ slug: post.slug, href: post.href, metadata: post.metadata }))
    .sort(
      (a, b) =>
        dateToTimestamp(b.metadata.updatedAt ?? b.metadata.publishedAt) -
        dateToTimestamp(a.metadata.updatedAt ?? a.metadata.publishedAt),
    );
}

export function formatBlogDate(date: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parseDate(date));
}

function normalizeBlogMetadata(slug: string, metadata: unknown): BlogPostMetadata {
  if (!isRecord(metadata)) {
    throw new Error(`Blog post "${slug}" must export a metadata object.`);
  }

  const title = readRequiredString(metadata, "title", slug);
  const description = readRequiredString(metadata, "description", slug);
  const publishedAt = readRequiredDate(metadata, "publishedAt", slug);
  const updatedAt = readOptionalDate(metadata, "updatedAt", slug);
  const tags = readTags(metadata, slug);
  const published = readRequiredBoolean(metadata, "published", slug);

  return {
    title,
    description,
    publishedAt,
    updatedAt,
    tags,
    published,
  };
}

function readRequiredString(
  metadata: Record<string, unknown>,
  field: string,
  slug: string,
): string {
  const value = metadata[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Blog post "${slug}" metadata.${field} must be a non-empty string.`);
  }

  return value;
}

function readRequiredBoolean(
  metadata: Record<string, unknown>,
  field: string,
  slug: string,
): boolean {
  const value = metadata[field];

  if (typeof value !== "boolean") {
    throw new Error(`Blog post "${slug}" metadata.${field} must be a boolean.`);
  }

  return value;
}

function readRequiredDate(metadata: Record<string, unknown>, field: string, slug: string): string {
  const value = readRequiredString(metadata, field, slug);
  parseDate(value);
  return value;
}

function readOptionalDate(
  metadata: Record<string, unknown>,
  field: string,
  slug: string,
): string | undefined {
  const value = metadata[field];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Blog post "${slug}" metadata.${field} must be a non-empty string.`);
  }

  parseDate(value);
  return value;
}

function readTags(metadata: Record<string, unknown>, slug: string): string[] {
  const value = metadata.tags;

  if (!Array.isArray(value) || !value.every((tag) => typeof tag === "string")) {
    throw new Error(`Blog post "${slug}" metadata.tags must be an array of strings.`);
  }

  return value;
}

function parseDate(value: string): Date {
  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    throw new Error(`Invalid blog post date "${value}".`);
  }

  return date;
}

function dateToTimestamp(value: string): number {
  return parseDate(value).valueOf();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
