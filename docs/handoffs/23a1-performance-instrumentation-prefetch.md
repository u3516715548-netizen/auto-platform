# Handoff — Etapa 23A.1: Performance instrumentation + prefetch

## Meta
- Data: 10 octombrie 2026
- Workspace: `C:\Users\Wolf\dev\aplicatie-masini`
- Branch: `master` (lucru local, necomis)
- Bază: Etapa 23A (`f032986`)
- Status: implementată local; **fără** commit / push / deploy
- Documente citite:
  - `docs/handoffs/README.md`
  - `docs/handoffs/audit-9-octombrie-2026.md`
  - `docs/handoffs/23a-cms-legal-pages-basic-seo.md`
  - `HANDOFF_Functionalitati.md`
  - `docs/architecture.md`
  - `docs/security.md`
  - `docs/auth-tenancy.md`

## Obiectiv

Instrumentare server opt-in pentru split-ul TTFB pe rutele publice + dezactivare prefetch RSC pe Link-urile care declanșează SSR costisitor. Fără cache HTML, fără schimbări middleware Auth, fără RLS/DB.

## Scope aprobat

- Instrumentare `PERF_SERVER_TIMING=1` (durate + meta non-PII)
- `prefetch={false}` pe Link-uri storefront grele
- Teste unit pentru toggle/sanitizare meta
- Handoff

## Ce nu intră în scope

- Cache HTML / `revalidatePath` / signed URL cache
- Paralelizare DB / reducere Auth pe rute publice
- Modificare `force-dynamic` / `no-store` / middleware matcher
- Migrări, RLS, env committed, Vercel settings
- Commit / push / deploy

## Stare înainte

Măsurători curl pe Production (`https://auto-platform-beige.vercel.app`, deploy `f032986`), 3× warm:

| URL | min TTFB | avg TTFB | max TTFB |
|-----|----------|----------|----------|
| `/` | 1,727 s | ~2,53 s* | 3,968 s |
| `/vehicles/koenigsegg-ccx` | 2,253 s | ~2,42 s | 2,506 s |
| `/compara` | 0,846 s | ~0,88 s | 0,929 s |
| `/salvate` | 0,861 s | ~0,88 s | 0,896 s |

\*avg home influențat de un cold outlier ~4 s; celelalte două ~1,7–1,9 s.

Din auditul anterior (LH Network): prefetch RSC pe carduri/sort ~0,7–1,3 s / request în background.

## Analiză și decizii

1. **Instrumentare opt-in** — default off; activare doar cu `PERF_SERVER_TIMING=1` (nu se scrie în `.env.local` în această etapă).
2. **Fără PII** — log doar span name + ms + meta whitelist (`route`, `path`, `kind`, `count`, `ok`, `page`, `status`).
3. **Prefetch selectiv** — dezactivat pe catalog/detaliu/filtre/sort/nav storefront; păstrat pe apex `/login` (ieftin).
4. **Nu se așteaptă scădere TTFB document** din această etapă — curl măsoară documentul, nu prefetch-ul client.

## Implementare

### Fișiere create
- `apps/web/src/lib/perf/server-timing.ts`
- `apps/web/src/lib/perf/__tests__/server-timing.test.ts`
- `docs/handoffs/23a1-performance-instrumentation-prefetch.md`

### Fișiere modificate
- `apps/web/src/lib/supabase/middleware.ts` — `middleware.total` + `middleware.getUser`
- `apps/web/src/lib/storefront/resolve-public-tenant.ts` — `tenant.resolve`
- `apps/web/src/lib/storefront/public-vehicles.ts` — `catalog.vehicles`, `vehicle.detail`
- `apps/web/src/lib/storefront/public-vehicle-media.ts` — `media.query`
- `apps/web/src/lib/media/sign-storage-url.ts` — `signedUrls`
- `apps/web/src/lib/storefront/load-public-company.ts` — `company.profile`
- `apps/web/src/lib/seo/load-public-seo-settings.ts` — `seo.settings`
- `apps/web/src/app/page.tsx` — `ssr.route` catalog + prefetch sort/salvate/reset
- `apps/web/src/app/vehicles/[slug]/page.tsx` — `ssr.route` + prefetch Înapoi
- `apps/web/src/app/compara/page.tsx` / `salvate/page.tsx` — `ssr.route` + prefetch Înapoi
- Storefront Links: `public-shell`, `public-vehicle-list`, `catalog-pagination`, `catalog-active-filters`, `catalog-filters`, `catalog-filter-drawer`, `compare-floating-bar`, `compare-page-client`, `saved-page-client`

### Fișiere șterse
- N/A

### Migrări
- N/A

### RLS / securitate
- Neschimbate. Instrumentarea nu loghează tokenuri, signed URLs, email, telefon, CUI, body.

### Environment variables
- **Nume nou (citit, nu commitat):** `PERF_SERVER_TIMING` — setează `1` pentru loguri server. Default: dezactivat.

## Link-uri cu `prefetch={false}`

| Zonă | Fișier | Destinație |
|------|--------|------------|
| Card catalog (imagine/titlu/specs) | `public-vehicle-list.tsx` | `/vehicles/[slug]` |
| Alternative carousel | via `PublicVehicleList` | `/vehicles/[slug]` |
| Sort + Salvează toolbar | `app/page.tsx` | `/?sort=…`, `/salvate` |
| Reset filtre empty state | `app/page.tsx` | `/` |
| Paginare | `catalog-pagination.tsx` | `/?page=…` |
| Chip-uri / reset filtre | `catalog-active-filters.tsx` | catalog query |
| Reset în filtre / drawer | `catalog-filters.tsx`, `catalog-filter-drawer.tsx` | `/` |
| Header / footer / nav mobil | `public-shell.tsx` | `/`, `/salvate`, `/compara` |
| Înapoi detaliu / compara / salvate | pages respective | `/` |
| Floating compare CTA | `compare-floating-bar.tsx` | `/compara` |
| Compară → catalog / detaliu | `compare-page-client.tsx` | `/`, `/vehicles/[slug]` |
| Salvate → catalog / detaliu | `saved-page-client.tsx` | `/`, `/vehicles/[slug]` |

**Păstrat prefetch default:** apex `Link` către `/login` (fără inventar DB).

## Instrumentare adăugată

Span-uri: `middleware.total`, `middleware.getUser`, `tenant.resolve`, `catalog.vehicles`, `vehicle.detail`, `media.query`, `signedUrls`, `company.profile`, `seo.settings`, `ssr.route`.

Format log: `[perf] <span> <ms>ms { meta? }` — doar pe server, niciodată în UI.

## Comportament rezultat

- Cu `PERF_SERVER_TIMING` unset/≠`1`: zero overhead de logging (early return).
- Cu `=1`: loguri pe stdout server pentru split TTFB.
- Navigarea rămâne identică; doar prefetch RSC în background este oprit pe linkurile de mai sus (după deploy).

## Verificări

### Comenzi rulate
- `pnpm db:test` → **90 passed**
- `pnpm typecheck` → OK
- `pnpm --filter @auto-platform/web test` → **293 passed** (+4 unit perf)
- `pnpm --filter @auto-platform/web build` → OK

### Verificare manuală (Production, încă fără 23A.1)
- Homepage ACME OK (3 vehicule, filtre Brand/etc. prezente)
- Link-uri catalog/detaliu/Compară/Salvate vizibile

### Măsurători după (Production încă `f032986` — 23A.1 nedeployat)

| URL | min | avg | max | Notă |
|-----|-----|-----|-----|------|
| `/` | 1,862 s | 1,900 s | 1,931 s | TTFB document neschimbat (așteptat) |
| `/vehicles/koenigsegg-ccx` | 2,419 s | 2,435 s | 2,446 s | idem |
| `/compara` | 0,843 s | 0,845 s | 0,847 s | idem |
| `/salvate` | 0,827 s | 0,837 s | 0,847 s | idem |

**Prefetch RSC:** îmbunătățirea percepută (fără `?_rsc` pe hover) se validează **după deploy** 23A.1 — curl nu o măsoară.

## Securitate multi-tenant

Neschimbată. Host-only tenancy, RLS, FORCE RLS, fără `service_role` pe path public utilizator. Loguri fără PII / fără signed URLs.

## Riscuri și limitări

- Primul click pe un link fără prefetch poate părea ușor mai „rece” (trade-off acceptat vs SSR background).
- Instrumentarea trebuie ținută off în Production până e nevoie de diagnostic.
- TTFB real (~2 s) rămâne — P1 (cache/Auth/DB) nerezolvat aici.
- Filtrele Brand etc. folosesc UI client + navigare form; nu Link prefetch (neschimbat).

## Ce nu a fost implementat

- Cache HTML / CDN
- Skip Auth middleware pe publice
- Paralelizare query / GUC batch
- Signed URL cache
- 23B sitemap/JSON-LD/OG

## Următorul pas recomandat

P1 din audit: decizie SLA stoc → cache scurt și/sau restrângere Auth pe path publice + reducere lanț DB/sign (cu instrumentarea 23A.1 ca ghid).

## Reguli pentru agentul următor

1. Nu comite/push/deploy fără cerere explicită.
2. Nu activa `PERF_SERVER_TIMING` în Production fără acord.
3. Nu reintroduce prefetch pe carduri/sort fără măsurători.
4. Nu amesteca P1 cache/middleware în același commit cu 23A.1.
5. Nu rescrie handoff-urile anterioare.
