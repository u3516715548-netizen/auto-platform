<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

## Local development

Cloud Agents use PostgreSQL 16 on localhost. Setup writes gitignored `apps/web/.env.local` with `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres` and the seed profile ids from `.env.example`. `pnpm db:migrate` and `pnpm db:seed` are safe to rerun.

Canonical checks are in `docs/architecture.md`: `pnpm --filter @auto-platform/web dev`, `pnpm typecheck`, `pnpm --filter @auto-platform/web test`, `pnpm db:test`, and `pnpm --filter @auto-platform/web build`.

- http://localhost:3000 — commercial landing
- http://acme.localhost:3000 — ACME catalog
- http://beta.localhost:3000 — Beta Autos

Seeded vehicles have no storage covers, so cards show "Imagine indisponibilă". Dealer login needs a real Supabase project. This database stubs `auth.users` and `auth.uid()` for migrations and RLS tests; it does not run Supabase Auth, so `/login` cannot create a session.
