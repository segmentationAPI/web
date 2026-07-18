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

Repository instructions prohibit local app builds and browser automation. Production builds,
generated-output validation, and deployment run in `.github/workflows/marketing-pages.yml`.

## GitHub Actions and Cloudflare Workers

GitHub Actions is the deployment pipeline. Pull requests run lint, formatting, type/content,
production-build, and generated-output validation on Blacksmith ARM runners. A successful push to
`main` runs the same checks and then deploys the verified static output to Cloudflare Workers using
the committed `wrangler.jsonc` configuration.

Configure these GitHub repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`: the account containing the `marketing` Worker
- `CLOUDFLARE_API_TOKEN`: a least-privilege token allowed to deploy that Worker

Configure `PUBLIC_CF_WEB_ANALYTICS_TOKEN` as a GitHub repository variable. The workflow supplies the
production marketing and dashboard origins directly. After the first successful GitHub deployment,
disconnect Cloudflare Workers Builds from the repository to prevent duplicate deployments.

## Domain cutover

1. Confirm the Worker preview passes the route-contract checks and manual visual and
   accessibility review.
2. Copy and verify every existing DNS record before moving authoritative nameservers, if the apex
   domain is not already on Cloudflare DNS.
3. Lower the relevant TTL before the cutover window.
4. Attach the production hostname only after the production deployment passes validation.
5. Keep the previous hosting target addressable throughout the observation window.
6. Roll back application code by promoting the previous successful Worker version. Roll back the
   hostname by pointing Cloudflare DNS to the previous hosting target; do not immediately move
   nameservers again.
