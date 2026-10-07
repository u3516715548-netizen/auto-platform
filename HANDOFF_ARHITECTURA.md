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
| Etapa 6 | **FINALIZATĂ** (6A inventar + 6B admin + 6C storefront) |
| Etapa 7 | **FINALIZATĂ local** (7A storage + 7B dashboard + 7C galerie publică) |
| Etapa 8 | **FINALIZATĂ local** (8A query + 8B UI + 8C drawer/SEO/a11y) |
| Etapa 9 | **FINALIZATĂ local** (9A branding + 9B Template 1 + 9C sticky/settings) |
| Etapa 10 | **FINALIZATĂ local** (10A anti-spam + 10B dashboard + 10C notificări + 10D polish) |
| Etapa 11 | **FINALIZATĂ local** (11A contract + 11B dashboard/CTA + 11C polish/docs) |
| Etapa 12 | **Hobby demo pe Vercel** — `HOBBY_DEMO_*`; deploy automat din `master` |
| Storefront UI | **Refine** — quick sheets, Compară/Salvate, Finanțare, Tehnic+Dotări |
| Git | `master` @ `5f86187` — *Refine storefront UI and add quick sheets* (pushed) |
| Commit / push / deploy | **interzise fără cerere explicită** |

`.env.local` există local — **nu afișa** conținutul (UUID-uri, `DATABASE_URL`, chei).

### Ultima sesiune (5–6 oct 2026)

- Filtre homepage: Brand / Caroserie / Combustibil / Preț / An → sheet dedicat + Continuă (`catalog-quick-sheets.tsx`, `make[]` în `CatalogQuery`).
- Detaliu: 01 Finanțare (sumă max = preț), 02 Tehnic+Dotări, 03 Descriere (centrate).
- Compară (2–4, localStorage), Salvate, iconuri storefront.
- Build local OK → commit `5f86187` → `git push origin master` → Vercel auto-deploy.
- Canvas handoff: `.cursor/projects/.../canvases/project-handoff.canvas.tsx`

## Stack curent

Turborepo + pnpm · Next.js 16 / React 19 / Tailwind 4 · Drizzle + Supabase Postgres · Supabase Auth (`@supabase/ssr` + `/login`) · Vitest (`db` + `web`) · mobile placeholder.

## Următoarea etapă

Verificare vizuală pe Vercel a UI-ului refine. Apoi **Etapa 13** template-uri suplimentare, sau hardening (middleware→proxy, rate-limit distribuit, email leads).  
Rezervări: fără cron real încă — [`docs/stages/11-reservations.md`](./docs/stages/11-reservations.md).

**Producție email (10C):** set `LEAD_EMAIL_PROVIDER` + provider SDK/API key când există implementare aprobată (în prezent doar noop/log).  
**Producție rate-limit (10A):** backend distribuit + `LEAD_RATE_LIMIT_SECRET` + `VERCEL`/`TRUSTED_PROXY`.  
**Hobby demo leads:** `HOBBY_DEMO_DISABLE_PUBLIC_LEADS=true`; Deployment Protection off pentru demo public.

## Rezumat Etapa 6 (6A + 6B + 6C)

| Item | Conținut | Status |
|------|----------|--------|
| Migrare `0003` | Enums + coloane inventar nullable + indexuri | OK |
| Zod / format | publish schema, features, EUR/km helpers | OK |
| Seed | available complete + draft incomplet | OK |
| Create/edit admin | create scurt; edit secțiuni RO; VIN staff | OK |
| Gate `available` | app-level; listă câmpuri lipsă în RO | OK |
| Storefront 6C | DTO extins; catalog/detaliu RO; SEO; fără VIN public | OK |
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

Verificat Etapa 6 (6A+6B+6C): `lint` OK · `typecheck` OK · `db:test` 28/28 · `web test` 72/72 · `web build` OK (warning Next.js: `middleware` → `proxy`).

Verificat Etapa 7 (7A+7B+7C + galerie UI): `lint` OK · `typecheck` OK · `db:test` 28/28 · `web test` 88/88 · `web build` OK.

## Rezumat Etapa 8 (8A + 8B + 8C)

| Item | Conținut | Status |
|------|----------|--------|
| 8A query | parse/serialize URL + Drizzle filtre + pageSize 12 | OK |
| 8B UI | filtre GET, chips, count, paginare, card cover | OK |
| 8C mobil | drawer sheet, focus trap, scroll lock, Escape | OK |
| SEO | `/` index,follow; orice query noindex + canonical `/` | OK |
| Contract | fără CSV multi-select; fără pageSize în URL | OK |

Verificat Etapa 8 (8A+8B+8C): `lint` OK · `typecheck` OK · `web test` 107/107 · `web build` OK.

## Rezumat Etapa 9 (9A + 9B + 9C)

| Item | Conținut | Status |
|------|----------|--------|
| 9A | branding whitelist, registry, tokens | OK |
| 9B | Template 1 shell/catalog/detail | OK |
| 9C sticky | mobil Mesaj/Sună/WhatsApp | OK |
| 9C settings | `/dashboard/settings` — doar **owner** | OK |
| Audit | `tenant.branding.update` + `changedKeys` (fără numere) | OK |
| Seed | ACME/BETA template-1 + phone/whatsapp demo | OK |

Verificat Etapa 9 (9A+9B+9C): `lint` OK · `typecheck` OK · `web test` 127/127 · `web build` OK.

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
| [06-vehicle-inventory-data.md](./docs/stages/06-vehicle-inventory-data.md) | Etapa 6 (**finalizată**) |
| [07-vehicle-media.md](./docs/stages/07-vehicle-media.md) | Etapa 7 (**finalizată local**) |
| [08-public-catalog-search.md](./docs/stages/08-public-catalog-search.md) | Etapa 8 (**finalizată local**) |
| [09-design-system-template.md](./docs/stages/09-design-system-template.md) | Etapa 9 (**finalizată local**) |

Transversal: [`docs/architecture.md`](./docs/architecture.md) · [`docs/database.md`](./docs/database.md) · [`docs/security.md`](./docs/security.md) · [`docs/auth-tenancy.md`](./docs/auth-tenancy.md).
