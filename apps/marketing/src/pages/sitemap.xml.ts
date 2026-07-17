import type { APIRoute } from "astro";

import { getPublishedBlogPosts } from "@/lib/blog";
import { marketingUrl } from "@/lib/site";

export const prerender = true;

const staticRoutes = [
  "/",
  "/pricing",
  "/blog",
  "/docs",
  "/docs/authentication",
  "/docs/jobs",
  "/docs/results",
  "/docs/sam3-alternatives",
  "/docs/upload",
];

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export const GET: APIRoute = async () => {
  const posts = await getPublishedBlogPosts();
  const staticEntries: { path: string; lastModified?: string }[] = staticRoutes.map((path) => ({
    path,
  }));
  const blogEntries: { path: string; lastModified?: string }[] = posts.map((post) => ({
    path: `/blog/${post.id}`,
    lastModified: post.data.updatedAt ?? post.data.publishedAt,
  }));
  const entries = [...staticEntries, ...blogEntries]
    .map(
      ({ path, lastModified }) =>
        `<url><loc>${escapeXml(new URL(path, marketingUrl).href)}</loc>${
          lastModified ? `<lastmod>${escapeXml(lastModified)}</lastmod>` : ""
        }</url>`,
    )
    .join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
};
