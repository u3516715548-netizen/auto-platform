# Etapa 8 — Căutare, filtre, sortare, paginare (catalog public)

**Status:** **FINALIZATĂ local** (8A + 8B + 8C)

## Decizii aprobate

| Decizie | Valoare |
|---------|---------|
| Multi-select | query params repetați (`fuel=diesel&fuel=hybrid`) |
| pageSize | fix **12**, absent din URL |
| sort default | `newest` (`created_at DESC`, tie-break `id ASC`) |
| sort allowlist | `newest`, `price_asc`, `price_desc`, `year_desc`, `mileage_asc` |
| SEO | doar `/` indexabil; query → `noindex,follow` + canonical `/` |
| `q` | make **sau** model (ILIKE), nu description/VIN |
| Filtre v1 | q, price*, year*, km*, fuel, transmission, bodyType, sort, page |
| Index migrare | **nu** în E8 |
| UI | Server Components + GET; RO / EUR / km; drawer mobil client |

## 8A — Contract query

- [`catalog-query.ts`](../../apps/web/src/lib/storefront/catalog-query.ts) — parse/serialize Zod-safe
- [`public-vehicles.ts`](../../apps/web/src/lib/storefront/public-vehicles.ts) — `listPublicVehiclesForCatalog` + count + paginare
- Teste: `catalog-query.test.ts`, `catalog-query-online.test.ts`

## 8B — UI catalog

- Filtre desktop GET, chips, count, paginare, card cover dominant
- Teste: `catalog-chips.test.ts`

## 8C — Drawer mobil + SEO + a11y

- [`catalog-filter-drawer.tsx`](../../apps/web/src/components/storefront/catalog-filter-drawer.tsx) — sheet mobil, focus trap, Escape, backdrop, scroll lock, `prefers-reduced-motion`
- ID-uri separate: `catalog-desktop-*` / `catalog-mobile-*`
- [`catalog-seo.ts`](../../apps/web/src/lib/storefront/catalog-seo.ts) — index/noindex + canonical `/`; fără termeni de căutare în metadata
- Count rezultate cu `aria-live="polite"`
- Teste: `catalog-etapa8c.test.ts`

## Verificare

```bash
pnpm --filter @auto-platform/web test
pnpm --filter @auto-platform/web lint
pnpm typecheck
pnpm --filter @auto-platform/web build
```
