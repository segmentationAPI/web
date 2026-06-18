import type { MetadataRoute } from "next";

import { getBaseUrl } from "@/lib/site";

// AI crawlers we explicitly welcome. Listing them by name documents intent and
// guards against future `*` rules accidentally locking them out. Split into
// training crawlers (build/refine the model) and retrieval crawlers (fetch us
// live to answer a user's question — these are what get us cited in answers).
const AI_CRAWLERS = [
  // OpenAI
  "GPTBot", // training
  "OAI-SearchBot", // ChatGPT search index
  "ChatGPT-User", // live retrieval
  // Anthropic
  "ClaudeBot", // training
  "Claude-SearchBot", // search index
  "Claude-User", // live retrieval
  // Perplexity
  "PerplexityBot", // search index
  "Perplexity-User", // live retrieval
  // Google (separate from Googlebot; gates Gemini / AI training)
  "Google-Extended",
  // Others
  "Applebot-Extended",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      {
        userAgent: AI_CRAWLERS,
        allow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
