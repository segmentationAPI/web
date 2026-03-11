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
- When adding dashboard env vars, update both `packages/env/src/dashboard.ts` and the `web#build.env` list in `turbo.json` so Turbo tracks them correctly.

DO NOT build any of the apps. Due to how your environment is configured, the build will never finish.
