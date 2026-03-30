import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  // Use production URL if available, fallback to Vercel preview URLs, then localhost
  const baseUrl =
    process.env.NEXT_PUBLIC_MARKETING_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

  const routes = [
    "",
    "/pricing",
    "/docs",
    "/docs/authentication",
    "/docs/jobs",
    "/docs/sam3-alternatives",
    "/docs/upload",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "yearly" : "monthly",
    priority: route === "" ? 1 : 0.8,
  }));
}
