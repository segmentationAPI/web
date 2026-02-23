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

## Build, Test, and Development Commands
Run from repo root:
- `pnpm install`: install workspace dependencies.
- `pnpm dev`: run all dev tasks through Turbo.
- `pnpm dev:web`: run only the dashboard app.
- `pnpm build`: build all apps/packages.
- `pnpm check-types`: run TypeScript checks across workspaces.
- `pnpm check`: run `oxlint` and format with `oxfmt`.
- `pnpm db:push | db:generate | db:migrate | db:studio`: Drizzle database workflows via `@segmentation/db`.

## Coding Style & Naming Conventions
- Language: TypeScript (`type: module` across workspaces).
- Lint/format: `oxlint` + `oxfmt` (also enforced by `lefthook` pre-commit).
- Keep components and utilities in `src/components` and `src/lib` respectively.
- Use clear file names by feature, e.g. `dashboard-queries.ts`, `route-auth.ts`.
- Follow Next.js app router conventions in `src/app` (`page.tsx`, route segments).

## Testing Guidelines
There is no dedicated test runner configured yet (`vitest`/`jest` not present).
Until a test framework is introduced:
- Treat `pnpm check-types` and `pnpm check` as required quality gates.
- For DB changes, run the relevant Drizzle command and validate behavior locally.
- If adding tests, prefer colocated `*.test.ts`/`*.test.tsx` files and document the new command in root `package.json`.

## Commit & Pull Request Guidelines
Recent history follows mostly Conventional Commits (`feat:`, `fix:`, `chore:`).
- Use format: `type(scope): short imperative summary`.
- Keep commits focused; avoid mixing refactors with behavior changes.
- PRs should include: purpose, key changes, local verification steps, env/db impacts, and screenshots for UI work.
- Link related issue(s) when available.
