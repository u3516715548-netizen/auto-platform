# Architecture

## Product

SaaS B2B2C „Shopify pentru dealeri auto”: storefront multi-tenant, dashboard dealer, stoc, lead-uri, branding. Mobile white-label Premium vine ulterior.

## Stack (aprobat)

| Layer | Choice |
|-------|--------|
| Monorepo | Turborepo + pnpm |
| Language | TypeScript strict |
| Web | Next.js App Router (`apps/web`) — storefront + dashboard |
| UI | Tailwind CSS + shadcn/ui |
| DB | Supabase PostgreSQL |
| Auth | Supabase Auth |
| ORM / migrations | Drizzle ORM (`packages/db`) |
| Validation | Zod (`packages/types`, server actions) |
| Multi-tenancy | `tenant_id` + PostgreSQL RLS + server checks |
| Media | Supabase Storage (portabil către R2/Images) |
| Jobs | Abstraction in `packages/core/jobs` (Inngest/Trigger.dev later) |
| Mobile | Expo placeholder in `apps/mobile` |

## Monorepo layout

```text
apps/web          Next.js — public storefront + dealer dashboard
apps/mobile       Expo skeleton only
packages/db       Drizzle schema, migrations, DB client
packages/ui       Shared UI primitives
packages/config   Shared TS / ESLint / Prettier
packages/types    Zod schemas + shared types
packages/core     Business domain modules
docs/             Architecture, database, security
```

## Local development path

Prefer a local NTFS path **without spaces**, e.g. `C:\Users\<you>\dev\aplicatie-masini`.

Mapped network drives / UNC paths that contain spaces (e.g. `\\server\Big Brother\...`) break `pnpm` postinstall scripts and symlinks on Windows. `.npmrc` uses `node-linker=hoisted` as a mitigation, but a clean local path remains the recommended root.

## Commands

```bash
pnpm install
pnpm --filter @auto-platform/web dev
pnpm typecheck
pnpm lint
pnpm db:generate
pnpm db:migrate    # needs DATABASE_URL
pnpm db:seed       # needs DATABASE_URL
pnpm db:test
```

## Data access (Etapa 2)

- Schema + migrations live in `packages/db`
- Server helpers: `getDb()`, `withTenantContext()`, `writeAuditLog()`, `assertSameTenant()`
- No browser → DB mutations

## Principles

1. Business logic lives server-side in Next.js (Route Handlers / Server Actions / server utilities).
2. No business mutations from the browser directly to the database.
3. Drizzle owns schema, migrations, and server data access — portable to any compatible PostgreSQL.
4. Supabase is current infrastructure, not the product domain layer.
5. RLS is mandatory but not sufficient: also verify session, membership, role, and tenant in code.
6. Never use `service_role` in user request paths.
7. Sensitive operations must be audited.
8. Multi-tenant paths must have explicit cross-tenant tests.

## Tenant resolution (Etapa 3)

- Production: `dealer.platforma.com` → tenant slug `dealer`.
- Development: `acme.localhost:3000` / `beta.localhost:3000` via `NEXT_PUBLIC_ROOT_DOMAIN`.
- Server utilities: `getCurrentUser`, `getCurrentTenant`, `requireMembership`, `requireRole`, `assertTenantAccess`.
- Details: [`auth-tenancy.md`](./auth-tenancy.md), stage doc [`stages/03-auth-multi-tenancy.md`](./stages/03-auth-multi-tenancy.md).
- Dashboard gate is auth + membership; full dashboard UI is Etapa 4.

## Out of scope (foundation phase)

Mobile white-label builds, marketplace sync, VIN decoder, leasing calculator, trade-in, Stripe billing, custom domains automation, microservices, Kubernetes, AI features.
