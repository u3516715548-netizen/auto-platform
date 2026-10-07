# Handoff — Etapa 16: Optimizare performanță

## Meta
- Data: 8 octombrie 2026
- Workspace: `C:\Users\Wolf\dev\aplicatie-masini`
- Branch: `master`
- Ultimul commit (la startul etapei): `0664db2` — *Let stock tabs scroll away; flush results toolbar to first card.*
- Status: finalizată (Wave 1 + Wave 2); Wave 3 **neimplementată** (blocată intenționat)
- Documente citite:
  - `docs/handoffs/README.md`
  - `docs/handoffs/15-performance-audit.md`
  - `docs/PERFORMANCE_AUDIT_2026-10-08.md` (nerescris)
  - `docs/architecture.md`, `docs/security.md`, `docs/auth-tenancy.md`

## Obiectiv

Reduce TTFB și costul LCP/JS pe storefront Template 1 prin Wave 1 (calea de date SSR) și Wave 2 (imagini + code-split), fără cache HTML și fără modificări middleware/Auth (Wave 3).

## Scope aprobat

- Wave 1: `cache()` pe resolve tenant; cover fără slug→id; query DISTINCT ON doar cover; select slim catalog; atribute lazy/priority pe imagini (via `next/image`).
- Wave 2: `next/image` + `remotePatterns` stricte; dynamic import `CatalogFilters` / `CatalogQuickSheet`.
- Re-măsurare TTFB; handoff.

## Ce nu intră în scope

- Wave 3: cache HTML/data, `revalidatePath` ca cache, restrângere middleware Auth, `getSession` vs `getUser`.
- Migrări DB, RLS, env, Email/CMS/Template 2/Expo (etape 17–25).
- Batch agresiv `clearPublicSessionGucs` (nesigur demonstrabil — doar documentat).

## Stare înainte

Baseline Etapa 15 (production local, Host `acme.localhost:3000` → server pe 3001):

| Rută | TTFB |
|------|------|
| Catalog `/` | ~1,0–1,6 s (avg warm ~1057 ms) |
| Detaliu | ~1,4 s (avg ~1414 ms) |
| Compară / Salvate | ~0,2 s |

## Analiză și decizii

1. **Tenant `cache()`** — dedupe metadata + page în același request; Host-only neschimbat.
2. **Cover** — ID-urile vin din SELECT-ul catalog; fără `resolveVehicleIdsBySlugs`; media cu `DISTINCT ON (vehicle_id)` pentru un singur cover.
3. **Select slim** — fără `description` / `features` / câmpuri de detaliu pe card; DTO public rămâne același tip cu valori goale/null unde e cazul; VIN/id/tenant excluse.
4. **`next/image`** — hostname exact din `NEXT_PUBLIC_SUPABASE_URL`, pathname `/storage/v1/object/sign/**`; fallback „Imagine indisponibilă”; `priority` doar index 0 / hero.
5. **Dynamic import** — panourile grele se încarcă la deschidere (`ssr: false`), fără a schimba a11y-ul când sunt montate.
6. **GUC clear** — neschimbat; reducerea riscă context greșit pe pool; recomandare: trata în Wave 3 doar cu instrumentare + review.

## Implementare
- Fișiere create:
  - `docs/handoffs/15-performance-audit.md` (înainte de cod, Etapa 15)
  - `docs/handoffs/16-performance-optimization.md` (acest fișier)
  - `apps/web/src/components/storefront/storefront-media-image.tsx`
- Fișiere modificate:
  - `apps/web/src/lib/storefront/resolve-public-tenant.ts`
  - `apps/web/src/lib/storefront/public-vehicle-media.ts`
  - `apps/web/src/lib/storefront/public-vehicles.ts`
  - `apps/web/src/components/storefront/public-vehicle-list.tsx`
  - `apps/web/src/components/storefront/public-vehicle-gallery.tsx`
  - `apps/web/src/components/storefront/catalog-filter-drawer.tsx`
  - `apps/web/next.config.ts`
- Fișiere șterse: N/A
- Migrări: N/A
- RLS / securitate: neschimbate (clear GUC păstrat pe path-urile existente)
- Environment variables: nicio variabilă nouă; `next.config` citește doar **numele** `NEXT_PUBLIC_SUPABASE_URL` pentru hostname images (fără a expune valoarea)

### Config Next.js

`images.remotePatterns`: un singur pattern — `protocol` + `hostname` din URL-ul public Supabase, `pathname: /storage/v1/object/sign/**`. Fără wildcard pe toate domeniile.

### Comportament signed URLs

- Semnare batch neschimbată (`createSignedDownloadUrls`, TTL existent).
- Optimizer-ul Next fetch-uiește URL-ul semnat server-side; la expirare, UI arată fallback / „Reîncarcă” pe gallery.
- Demo `/demo-vehicles/*` rămâne path local (fără remotePatterns necesare).

## Comportament rezultat

- Catalog SSR: mai puține query-uri (fără slug→id; media doar cover; payload slim).
- Imagini: LCP pe primul card / hero gallery; restul lazy.
- Bundle inițial catalog: drawer/sheets în chunk separat.

## Verificări
- Comenzi rulate:
  - `pnpm typecheck` — OK
  - `pnpm db:test` — 34 passed
  - `pnpm --filter @auto-platform/web test` — 237 passed (inclusiv online catalog/gallery)
  - `pnpm --filter @auto-platform/web build` — OK
- Rezultate TTFB (aceeași metodă: `next start` :3001, `Host: acme.localhost:3000`):

| Rută | Înainte (Etapa 15) | După (Wave 1+2) |
|------|--------------------|-----------------|
| Catalog `/` (avg 3× warm) | ~1057 ms | **~879 ms** |
| Detaliu (avg 3×) | ~1414 ms | **~1208 ms** |
| Compară | ~217 ms | **~228 ms** |
| Salvate | ~217 ms | **~226 ms** |

Ținta auditului (&lt;600–700 ms catalog) **nu** este atinsă doar cu Wave 1+2.

- Teste adăugate / modificate: N/A (acoperire existentă ok)
- Verificare manuală / HTTP smoke: catalog, detaliu, Compară, Salvate → 200 pe production local cu Host corect; cover/gallery markup prezent

## Securitate multi-tenant

- Tenant tot din Host; fără `tenant_id` client.
- Fără `service_role` pe path user (semnare rămâne server-only ca înainte).
- RLS / FORCE RLS neschimbate; `clearPublicSessionGucs` încă apelat pe path-urile publice de date.
- DTO public: fără VIN, id, tenantId; id folosit doar server-side pentru cover attach.
- Fără secrete în documentație / output.

## Riscuri și limitări

- TTFB încă &gt;700 ms — bottleneck rămas: `force-dynamic`, Auth middleware, semnare Storage, latență DB (Wave 3 / infra).
- `next/image` pe signed URL: cache miss la fiecare token nou; acceptabil vs `<img>`.
- Dynamic import: scurt delay la prima deschidere a filtrelor (trade-off intentional).
- DISTINCT ON cover: Postgres-specific (OK pe Supabase).

## Ce nu a fost implementat

- Wave 3 (cache HTML, middleware Auth) — blocată până la decizie după aceste măsurători.
- Batch `clearPublicSessionGucs` — nesigur fără dovezi pe pool; lăsat ca recomandare.
- Optimizare thumbnails galerie (doar hero folosește `StorefrontMediaImage`).
- Commit / push / deploy.

## Următorul pas recomandat

1. Decizie produs pe **Wave 3**: cache scurt 15–30 s pe catalog vs stoc „instant” după rezervare.  
2. Dacă da → etapă dedicată sau continuare 16b cu review securitate.  
3. Altfel → Etapa **17** (email lead) sau **18** (curățare demo), după prioritate business.  
4. Commit explicit când utilizatorul cere (include handoff-uri 15/16 + patch-uri perf).

## Reguli pentru agentul următor

- Nu activa Wave 3 fără aprobare explicită.
- Nu rescrie `PERFORMANCE_AUDIT_2026-10-08.md`.
- La commit: include `docs/handoffs/15-*.md`, `16-*.md` și fișierele Wave 1+2.
- Re-măsoară TTFB după orice schimbare Wave 3.
