/**
 * Resolve the canonical site origin (no trailing slash).
 *
 * Prefers the explicit production URL, then Vercel's production/preview hosts,
 * and finally localhost for local dev. Shared by robots.ts, sitemap.ts, and the
 * llms.txt route so they always agree on the base URL.
 */
export function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_MARKETING_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000")
  );
}
