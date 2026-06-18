import type { MetadataRoute } from "next";

import { getAllBlogPosts } from "@/lib/blog";
import { getBaseUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  const routes = [
    "",
    "/pricing",
    "/blog",
    "/docs",
    "/docs/authentication",
    "/docs/jobs",
    "/docs/results",
    "/docs/sam3-alternatives",
    "/docs/upload",
  ];

  const staticRoutes: MetadataRoute.Sitemap = routes.map((route) => {
    const isHome = route === "";

    return {
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: isHome ? "yearly" : "monthly",
      priority: isHome ? 1 : 0.8,
    };
  });

  const blogRoutes = (await getAllBlogPosts()).map((post) => ({
    url: `${baseUrl}${post.href}`,
    lastModified: new Date(post.metadata.updatedAt ?? post.metadata.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...blogRoutes];
}
