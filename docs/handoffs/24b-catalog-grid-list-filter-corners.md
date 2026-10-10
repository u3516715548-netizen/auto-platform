# Handoff — Etapa 24B: Catalog Grid/Listă + colțuri filtre T2

## Meta
- Data: 10 octombrie 2026
- Workspace: `C:\Users\Wolf\dev\aplicatie-masini`
- Branch: `master` (lucru local, necomis)
- Bază: Etapa 24 (`f485bc3`)
- Status: implementată local; **gata pentru commit separat**; **fără** commit / push / deploy până la aprobare
- Documente citite:
  - `docs/handoffs/README.md`
  - `docs/handoffs/24-template-2.md`
  - `docs/handoffs/23a2-production-performance-cache-middleware-ssr.md`

## Obiectiv

1. Elimină colțurile albe din panoul de filtre pe Template 2.
2. Activează selectorul Grid / Listă pe catalogul public (state client + localStorage per tenant).

## Cauză colțuri albe

`.catalog-scroll-filter-host` avea `background-color: #ffffff` hardcodat. Cardul de filtre (`.sf-solid-card` + `rounded-2xl`) stă peste acest host rectangular; pe T2 cardul e dark, iar albul host-ului se vedea în cele 4 colțuri rotunjite.

**Fix:** `background-color: var(--sf-surface, #ffffff)` (+ override explicit T2). La fel pentru `.catalog-results-toolbar`. Template 1 rămâne alb via `--sf-surface: #ffffff`.

## Grid / Listă

- Implicit: `grid`
- Persistare: `localStorage` cheie `ap.sf.catalog-view.v1.{tenantSlug}`
- Fără URL / fără Data Cache / middleware
- Grid: `grid-cols-2` + `lg:grid-cols-3`
- Listă: un rând per vehicul; vertical (imagine sus) sub `lg`, orizontal (imagine stânga) de la `lg`
- Toolbar: Grid / Listă / sort ciclic (link) — fără CTA „Salvează” redundant
- Toggle: butoane reale + `aria-pressed`
- Sortare: **nu** este dropdown; rămâne link care ciclă `newest` / preț asc / preț desc

## Fișiere

| Zonă | Fișiere |
|------|---------|
| CSS | `apps/web/src/app/globals.css` |
| View mode | `apps/web/src/lib/storefront/catalog-view-mode.ts` |
| UI | `catalog-results-section.tsx`, `public-vehicle-list.tsx`, `icons.tsx`, `page.tsx` |
| Teste | `catalog-view-mode.test.ts` |

## Ce nu intră

- DB / RLS / env / deploy
- Registry T2 / Zod / apply / Preview DEMO
- Filtre, sort, paginare, Compară/Salvate logică, CMS, SEO

## Verificări

```text
pnpm db:test          → 90 passed
pnpm typecheck        → OK
pnpm --filter @auto-platform/web test → 311 passed
pnpm --filter @auto-platform/web build → OK
```

### Smoke local

- ACME/Beta T1: 200; Golf 404; toggle Grid/Listă prezent
- Listă: `data-catalog-layout="list-row"`, preferință `ap.sf.catalog-view.v1.acme` persistă după refresh
- T2 temporar (owner local): `hostBg === cardBg === rgb(24,24,27)` — fără colțuri albe; restaurat T1

## Commit propus (doar după aprobare)

```text
fix(storefront): catalog grid/list toggle and T2 filter corner fix

Use surface tokens for filter chrome so dark Template 2 no longer shows
white corners, and wire a per-tenant Grid/List preference in localStorage.
```
