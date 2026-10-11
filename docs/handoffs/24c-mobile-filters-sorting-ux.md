# Handoff — Etapa 24C: Mobile filters and sorting UX

## Meta
- Data: 11 octombrie 2026
- Workspace: `C:\Users\Wolf\dev\aplicatie-masini`
- Branch: `master` (lucru local, **necomis**)
- Bază: Etapa 24B (`c8a2a5b`)
- Status: implementată local; **gata pentru verificare read-only înainte de commit**; fără commit / push / deploy până la aprobare
- Documente citite:
  - `docs/handoffs/README.md`
  - `docs/handoffs/24b-catalog-grid-list-filter-corners.md`
  - `docs/handoffs/24-template-2.md`
  - `docs/handoffs/23a2-production-performance-cache-middleware-ssr.md`

## Obiectiv

1. Auto-zoom iOS: inputuri filtre mobile ≥ 16px (fără blocare zoom).
2. Drag handle real pe filter bottom sheet.
3. Stacking: sheet din spatele bottom nav; „Vezi rezultate” lipit de nav (fără gol alb); safe-area.
4. Dropdown real de sortare pe opțiunile URL existente.

## Ce s-a livrat

| Zonă | Detaliu |
|------|---------|
| A Auto-zoom | `text-base` / `catalog-filter-mobile-field` + CSS `font-size: 16px` în `.catalog-filter-sheet`; `md:` poate fi `0.875rem` |
| B Drag | `CatalogSheetShell` + Pointer Events; prag 96px / viteză; listă scrollabilă separat; Escape / × / backdrop |
| C Stack | `--sf-mobile-nav-clearance` + `SF_MOBILE_NAV_CLEARANCE_CSS`; z-index sheet 75 / nav 90→110 overlay; footer padding = clearance |
| D Sort | `CatalogSortMenu` listbox: Recente + opțiuni `CATALOG_SORT_VALUES`; portal `fixed` pe `document.body` (evită cliparea de chrome filtre); păstrează query params |

## Fișiere

| Zonă | Fișiere |
|------|---------|
| Shell / drag | `catalog-sheet-shell.tsx`, `catalog-sheet-drag.ts`, `mobile-nav-layout.ts` |
| Wire | `catalog-filter-drawer.tsx`, `catalog-quick-sheets.tsx`, `catalog-filters.tsx`, `public-shell.tsx` |
| Sort | `catalog-sort-menu.tsx`, `catalog-results-section.tsx`, `app/page.tsx` |
| CSS / icons | `globals.css`, `icons.tsx` (ChevronDown, Check) |
| Teste | `catalog-sheet-drag.test.ts`, `catalog-sort-menu.test.ts`, update `catalog-view-mode.test.ts` |
| WIP (necomis, untracked) | `.wip-24c/` — sursă de audit; nu se comite |

## În afara scope-ului

- DB / RLS / Storage / env / deploy / cache / middleware / Auth / T2 registry / Preview DEMO
- Regresii intenționate pe Grid/Listă 24B — neschimbate

## Limitări

- Drag pe handle/header doar (nu pe lista scrollabilă) — by design
- Dropdown sort: meniu absolut în toolbar; pe overflow-hidden al părinților foarte agresivi ar putea tăia — toolbar-ul catalog nu clipuiește
- Verificare auto-zoom iOS reală necesită device/Safari; contractul e font-size ≥ 16px
