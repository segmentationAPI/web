import { getCollection, type CollectionEntry } from "astro:content";

const blogSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type BlogPost = CollectionEntry<"blog">;

export async function getPublishedBlogPosts(): Promise<BlogPost[]> {
  const posts = await getCollection("blog");

  for (const post of posts) {
    if (!blogSlugPattern.test(post.id)) {
      throw new Error(`Invalid blog slug "${post.id}". Use a lowercase kebab-case file name.`);
    }
  }

  return posts
    .filter((post) => post.data.published)
    .sort(
      (a, b) =>
        Date.parse(b.data.updatedAt ?? b.data.publishedAt) -
        Date.parse(a.data.updatedAt ?? a.data.publishedAt),
    );
}

export function formatBlogDate(date: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}
