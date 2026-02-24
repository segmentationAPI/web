# Repository Guidelines

## Project Structure & Module Organization
This repository is a `pnpm` + Turborepo monorepo.
- `apps/dashboard`: Next.js app (port `3001`), authenticated product surface.
- `apps/marketing`: Next.js app (port `3000`), public-facing site.
- `packages/auth`: Better Auth integration and auth utilities.
- `packages/db`: Drizzle schema, config, and DB scripts.
- `packages/env`: Runtime env validation per app (`dashboard.ts`, `marketing.ts`).
- `packages/config`: shared config package scaffold.

Primary source lives under each package/app `src/` directory.

## Coding Style & Naming Conventions
- Language: TypeScript (`type: module` across workspaces).
- Lint/format: `oxlint` + `oxfmt` (also enforced by `lefthook` pre-commit).
- Keep components and utilities in `src/components` and `src/lib` respectively.
- Use clear file names by feature, e.g. `dashboard-queries.ts`, `route-auth.ts`.
- Follow Next.js app router conventions in `src/app` (`page.tsx`, route segments).


DO NOT build any of the apps. Due to how your environment is configured, the build will never finish.
