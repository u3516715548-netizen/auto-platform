# Handoff — Etapa 23A.2: Cache HTML, middleware Auth public, paralelizare SSR

## Meta
- Data: 10 octombrie 2026
- Workspace: `C:\Users\Wolf\dev\aplicatie-masini`
- Branch: `master` (lucru local, necomis)
- Bază: Etapa 23A.1 (`7de3ae9`)
- Status: implementată local; **gata pentru commit separat**; **fără** commit / push / deploy până la aprobare
- Documente citite:
  - `docs/handoffs/README.md`
  - `docs/handoffs/23a1-performance-instrumentation-prefetch.md`
  - `docs/handoffs/16-performance-optimization.md`
  - `docs/PERFORMANCE_AUDIT_2026-10-08.md`

## Obiectiv

Reduce TTFB pe rutele publice ACME prin: cache scurt (HTML hint + Data Cache), skip `getUser()` pe path publice, paralelizare query-uri SSR independente — fără a compromite izolarea tenant, RLS, Auth pe private, Compară/Salvate, Preview Template 1.

## Scope aprobat

- TTL **30 s** (`PUBLIC_STOREFRONT_REVALIDATE_SECONDS`) — SLA stoc fără invalidare explicită
- `export const revalidate = 30` pe `/`, `/vehicles/[slug]`, `/p/[slug]`
- `unstable_cache` pe catalog / detail / alternatives (tag per tenant)
- `revalidatePath` + `updateTag` la mutații inventar / branding / CMS / SEO / rezervări
- Middleware: `getUser()` doar pe dashboard / login / invite / template-preview
- Paralelizare SSR pe catalog / detaliu / CMS metadata+page
- Data Cache pe inventar **fără** signed URLs (semnare la fiecare request)
- Teste unit pentru helper cache / middleware path rules

## Ce nu intră în scope

- Migrări DB / RLS / Storage / `.env.local` / Vercel settings
- Prelungire TTL signed URLs
- Cache pe Compară / Salvate / dashboard / sesiune / PII
- Pool DB nou / batch GUC
- Commit / push / deploy

## Decizie SLA

**Acceptat în această etapă:** stocul public poate fi stale ≤ **30 s** dacă o mutație nu apelează invalidarea; cu `revalidatePublicStorefrontPaths` (Server Actions) invalidarea e imediată via `updateTag` + `revalidatePath`.

Nu este necesară o decizie de business suplimentară pentru a livra 23A.2; dacă produsul cere „instant fără TTL”, TTL-ul trebuie coborât la 0 / `force-dynamic` (regresie perf).

## Implementare

### Fișiere create
- `apps/web/src/lib/perf/public-storefront-cache.ts`
- `apps/web/src/lib/perf/__tests__/public-storefront-cache.test.ts`
- `docs/handoffs/23a2-production-performance-cache-middleware-ssr.md`

### Fișiere modificate (principale)
- `apps/web/src/lib/supabase/middleware.ts` — skip Auth pe publice; Cache-Control hint
- `apps/web/src/app/page.tsx` — `revalidate=30`; paralel tenantView + catalog
- `apps/web/src/app/vehicles/[slug]/page.tsx` — `revalidate=30`; paralel detail + tenant / meta + seo
- `apps/web/src/app/p/[slug]/page.tsx` — `revalidate=30`; paralel page + tenant / seo
- `apps/web/src/lib/storefront/public-vehicles.ts` — Data Cache scurt pe list/detail/alts
- Mutări invalidare: `update-vehicle-status`, `update-vehicle`, `archive-vehicle`, rezervări, CMS, SEO, company, branding, template

### Rute cache-uite (scurt)
| Rută | Mecanism |
|------|----------|
| `/` | `revalidate=30` + Data Cache catalog + Cache-Control hint |
| `/vehicles/[slug]` | idem + Data Cache detail/alts |
| `/p/[slug]` | `revalidate=30` + Cache-Control hint |

### Rute **fără** cache HTML partajat
- `/compara`, `/salvate` — rămân `force-dynamic`
- `/dashboard/**`, `/login/**`, `/invite/**`, `/storefront-template-preview`
- Răspunsuri cu sesiune / PII (nu apar pe path-urile de mai sus)

### Middleware pe rute publice
- Rezolvare Host → `x-tenant-slug`
- **Fără** `createServerClient` / `getUser()`
- Fără Cache-Control CDN (nu e obiectivul principal; Next îl rescrie pe rute Host)

### Query-uri paralelizate
- Catalog: `toPublicTenantViewForRequest` ∥ `listPublicVehiclesForCatalog`
- Detaliu: `getPublicVehicleDetailBySlug` ∥ `toPublicTenantViewForRequest` (apoi alternatives)
- Detaliu metadata: `getPublicVehicleBySlug` ∥ `loadPublicSeoSettings`
- CMS: page ∥ tenantView; metadata: page ∥ seo

### Signed URLs
- **Nu** intră în Data Cache — inventarul e cache-uit; `attachPublicCoverImages` / `attachPublicDetailImages` rulează per request
- Nu sunt logate; TTL semnare neschimbat

## Limitări importante

- Pagina rămâne marcată **Dynamic** în build (Host via `headers()`). Full Route Cache HTML pe CDN poate fi limitat; Data Cache (fără signed URLs) + skip Auth + paralelizare sunt câștigurile fiabile pe TTFB.

## Verificări

### Comenzi
- `pnpm db:test` → **90 passed**
- `pnpm typecheck` → OK
- `pnpm --filter @auto-platform/web test` → **298 passed** (+5 unit cache)
- `pnpm --filter @auto-platform/web build` → OK

### Smoke local (127.0.0.1:3000 + Host)
- ACME `/` — **200**, 3 mașini, `koenigsegg-ccx` prezent, fără `golf-8-acme`
- ACME `/vehicles/koenigsegg-ccx` — **200**
- ACME `/vehicles/golf-8-acme` — **404**
- Beta `/` — **200**, 2 mașini, fără `koenigsegg-ccx` / `golf-8-acme`
- Compară / Salvate — **200**, fără inventar ACME în HTML
- Warm local ~500 ms pe home/detail (Data Cache + fără `getUser`)
- Răspuns final Cache-Control: `no-cache, must-revalidate` (Next rescrie hint-ul middleware pe rute dinamice Host/`headers()` — așteptat; Data Cache rămâne activ)

## Securitate multi-tenant

- Host-only tenancy neschimbată; tag Data Cache scoped `public-sf:${tenantId}`
- RLS / FORCE RLS neschimbate; `clearPublicSessionGucs` pe MISS
- Auth pe private neschimbat; publice fără refresh cookie (acceptat)
- Fără PII / sesiune în HTML cache-uit

## Riscuri stoc învechit

- Fără mutație: max **30 s** stale
- Cu mutație + `revalidatePublicStorefrontPaths`: invalidare imediată (Server Action)
- Dacă o mutație uită invalidarea → stale până la TTL

## Următorul pas

1. (Opțional) smoke invalidare: schimbă status vehicul în dashboard → confirmă dispariție imediată pe storefront
2. Commit / push / deploy **doar** la cerere explicită
3. După deploy: curl TTFB pe Production (+ `PERF_SERVER_TIMING=1` doar cu acord)

## Reguli pentru agentul următor

1. Nu comite/push/deploy fără cerere.
2. Nu coborî TTL sub 30 fără aprobare SLA; nu urca fără aprobare.
3. Nu reintroduce `getUser()` pe path publice.
4. Nu cache-ui Compară / Salvate.
5. Nu rescrie handoff-urile 23A / 23A.1.
