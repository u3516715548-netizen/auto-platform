# Handoff — Platformă SaaS „Shopify pentru Auto”

**Sursa de adevăr (scurt):** acest fișier.
**Detalii pe etape:** [`docs/stages/`](./docs/stages/).

## Stare actuală

| Item | Valoare |
|------|---------|
| Workspace | `C:\Users\Wolf\dev\aplicatie-masini` |
| Etapa 1 | finalizată |
| Etapa 2 | finalizată (Supabase: migrate, seed, RLS, teste) |
| Etapa 3 | finalizată — Auth cookies + tenancy host + guards |
| Etapa 4 | finalizată (4A–4E) |
| Etapa 5 | **FINALIZATĂ** (storefront public + migrare `0002`) |
| Git | repo inițializat, 0 commit-uri |
| Commit / push / deploy | **interzise fără cerere explicită** |

`.env.local` există local — **nu afișa** conținutul (UUID-uri, `DATABASE_URL`, chei).

## Stack curent

Turborepo + pnpm · Next.js 16 / React 19 / Tailwind 4 · Drizzle + Supabase Postgres · Supabase Auth (`@supabase/ssr` + `/login`) · Vitest (`db` + `web`) · mobile placeholder.

## Următoarea etapă

**Etapa 6+** — după confirmare (vezi roadmap în [`docs/stages/00-project-overview.md`](./docs/stages/00-project-overview.md)).

## Rezumat Etapa 5

| Item | Conținut | Status |
|------|----------|--------|
| RLS `0002` | `tenants_select_public_storefront` (anon SELECT active\|trial) | OK |
| Catalog `/` | Host → tenant; doar `available`; apex landing | OK |
| Detaliu `/vehicles/[slug]` | DTO public + SEO | OK |
| Lead | „Sunt interesat”; active only; honeypot + cooldown 5 min | OK |
| Securitate DTO | fără id/plan/domain/branding brut în browser | OK |
| Teste | izolare DB + unit/online web storefront | OK |

Migrare sursă de adevăr: `packages/db/drizzle/0002_tenants_public_storefront_select.sql`.
`ENABLE`/`FORCE` RLS pe `tenants` **neschimbate**. Fără `service_role` pe path-uri user.

Verificat Etapa 5 (post-teste complete): `lint` OK · `typecheck` OK · `db:test` 25/25 · `web test` 53/53 · `web build` OK.

Warning build: Next.js middleware → proxy deprecation (informativ; fără blocaj).

## Rezumat Etapa 4

| Sub | Conținut | Status |
|-----|----------|--------|
| 4A | Login/logout tenant-aware | OK |
| 4B | Dashboard shell responsive | OK |
| 4C | Listă + create vehicule | OK |
| 4D | Edit / status / arhivare + audit | OK |
| 4E | Polish mobile + teste securitate | OK |

## Reguli de securitate permanente

1. Nu afișa `.env.local`, UUID-uri reale, `DATABASE_URL` sau chei Supabase.
2. Nu folosi `service_role` pe request-uri user.
3. Nu dezactiva RLS / FORCE RLS.
4. Nu elimina FK `profiles.id → auth.users.id`.
5. Nu accepta `tenant_id` arbitrar din client.
6. Nu permite acces cross-tenant.
7. Storefront public: whitelist DTO; `suspended` → 404; lead doar pe tenant `active`.

## Comenzi de verificare

```bash
pnpm lint
pnpm typecheck
pnpm db:test
pnpm --filter @auto-platform/web test
pnpm --filter @auto-platform/web build
```

## Documentație pe etape

| Doc | Conținut |
|-----|----------|
| [00-project-overview.md](./docs/stages/00-project-overview.md) | Obiectiv, stack, principii, roadmap |
| [01-monorepo-foundation.md](./docs/stages/01-monorepo-foundation.md) | Etapa 1 (finalizată) |
| [02-supabase-drizzle-rls.md](./docs/stages/02-supabase-drizzle-rls.md) | Etapa 2 (finalizată) |
| [03-auth-multi-tenancy.md](./docs/stages/03-auth-multi-tenancy.md) | Etapa 3 (finalizată) |
| [04-vehicles-dashboard.md](./docs/stages/04-vehicles-dashboard.md) | Etapa 4 (finalizată) |
| [05-public-storefront.md](./docs/stages/05-public-storefront.md) | Etapa 5 (**finalizată**) |

Transversal: [`docs/architecture.md`](./docs/architecture.md) · [`docs/database.md`](./docs/database.md) · [`docs/security.md`](./docs/security.md) · [`docs/auth-tenancy.md`](./docs/auth-tenancy.md).
