# SegmentationAPI marketing site

This package is the statically generated Astro marketing site.

Tailwind CSS styles Astro templates, MDX content, and the small React islands. React is reserved for
`LiveDemo`, `VideoDemo`, and `TokenPricingCard`; all other UI and page content uses Astro components
and native HTML.

## Package commands

- `pnpm --filter marketing dev`
- `pnpm --filter marketing lint`
- `pnpm --filter marketing format:check`
- `pnpm --filter marketing check-types`
- `pnpm --filter marketing build`
- `pnpm --filter marketing validate-static` (requires `dist/` from a build)

Repository instructions prohibit local app builds and browser automation. Production builds and
generated-output validation run in `.github/workflows/marketing-pages.yml`.

## Cloudflare Pages Git integration

Cloudflare Pages Git integration is the deployment pipeline. Git integration and Wrangler Direct
Upload cannot be combined on the same Pages project, so the GitHub workflow validates and retains
the artifact while Cloudflare performs atomic production and preview deployments from Git.

Create the Pages project with these settings:

- Repository: canonical `segmentationAPI/monorepo`
- Production branch: `main`
- Root directory: `/web`
- Build command: `pnpm install --frozen-lockfile && pnpm --filter marketing build && pnpm --filter marketing validate-static`
- Build output directory: `apps/marketing/dist`
- Node.js: `24`
- `PUBLIC_MARKETING_URL`: `https://www.segmentationapi.com`
- `PUBLIC_APP_URL`: the production dashboard origin
- `PUBLIC_CF_WEB_ANALYTICS_TOKEN`: the Cloudflare Web Analytics site token

Cloudflare supplies `CF_PAGES_BRANCH`. Preview builds use that value to emit `noindex, nofollow`
metadata and a disallowing `robots.txt`; production builds emit the public crawler policy.

## Domain cutover

1. Confirm the Pages preview passes the route-contract artifact checks and manual visual and
   accessibility review.
2. Copy and verify every existing DNS record before moving authoritative nameservers, if the apex
   domain is not already on Cloudflare DNS.
3. Lower the relevant TTL before the cutover window.
4. Attach the production hostname only after the production deployment passes validation.
5. Keep the previous hosting target addressable throughout the observation window.
6. Roll back application code by promoting the previous successful Pages deployment. Roll back the
   hostname by pointing Cloudflare DNS to the previous hosting target; do not immediately move
   nameservers again.
