import type { APIRoute } from "astro";

import { isProductionDeployment, marketingUrl } from "@/lib/site";

export const prerender = true;

export const GET: APIRoute = () => {
  const rules = isProductionDeployment ? "User-agent: *\nAllow: /" : "User-agent: *\nDisallow: /";

  return new Response(`${rules}\n\nSitemap: ${marketingUrl}/sitemap.xml\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
