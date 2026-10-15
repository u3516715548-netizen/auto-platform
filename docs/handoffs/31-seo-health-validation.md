# Handoff 31 — SEO Health & Validation (Phase 7)

**Data:** 2026-10-16 (Europe/Bucharest)
**Status:** DONE local — fără commit / push / deploy
**Depinde de:** Phase 2–6 (SEO Core, Marketing, Consent, Events, Content SEO)
**Urmează:** Phase 8 — vezi `docs/handoffs/32-final-qa-production-readiness.md`

---

## Decizii

1. On-demand report (fără tabel `tenant_seo_health_runs` în v1)
2. Engine: DB + metadata builders + live Host fetch
3. UI: Marketing → SEO Health (`/dashboard/settings/marketing/health`)
4. Owner-only (`requireSettingsOwner` + nav `ownerOnly`)
5. Severități: Critical / Warning / Passed / Info + scor intern Autobear (nu Google)

---

## Unde stă engine-ul

| Piesă | Path |
|-------|------|
| Types / check IDs | `apps/web/src/lib/seo/health/types.ts` |
| Evaluator pur | `apps/web/src/lib/seo/health/evaluate-seo-health.ts` |
| Summarize / sort | `apps/web/src/lib/seo/health/summarize.ts` |
| Live Host fetch | `apps/web/src/lib/seo/health/live-fetch.ts` |
| Owner loader | `apps/web/src/lib/seo/health/run-seo-health.ts` |
| UI | `apps/web/src/components/dashboard/seo-health-report.tsx` |
| Page | `apps/web/src/app/dashboard/settings/marketing/health/page.tsx` |
| Nav | `settings-nav.ts` → Marketing children `health` |
| Tests | `apps/web/src/lib/seo/health/__tests__/seo-health.test.ts` |

---

## Checks acoperite

- missing title / meta / H1
- missing / invalid canonical override
- noindex în sitemap; indexable lipsă din sitemap
- draft/archived public (live probe)
- FAQ schema doar dacă FAQ există; ItemList pe inventory cu rezultate
- OG image / fallback warning
- homepage indexingEnabled (info dacă off)
- robots / sitemap respond + mismatch indexing
- /compara + /salvate noindex (builder + live)
- verification mismatch (configurat dar absent în HTML)
- consent banner + GTM pre-consent

---

## Static vs live

| Tip | Exemple |
|-----|---------|
| **Static (DB + builders)** | homepage/catalog metadata, CMS fields, sitemap eligibility, forced noindex metadata, verification builder, vehicle sample |
| **Live (HTTP Host)** | robots.txt, sitemap.xml `<loc>`, /compara /salvate HTML, homepage consent/GTM/verification, draft probe |

---

## Scoring

- Sumar: `N Critical · N Warnings · N Passed` (+ Info)
- `internalScore` 0–100: formula locală Autobear din counts — **nu** se prezintă ca Google score

---

## Limitări / Phase 8

- Fără Search Console API, cron, istoric runs
- Fără AI content / apex Autobear marketing
- Live probe depinde de server local (`SEO_HEALTH_FETCH_BASE` / `SMOKE_BASE` / `:3000`)
- Phase 8: suite QA extinsă, runbook dealer, checklist manual 2 tenants

---

## Teste (la livrare)

| Check | Rezultat |
|-------|----------|
| Unit `seo-health.test.ts` | **8 PASS** |
| Unit regression (settings-nav, marketing, CMS/SEO Phase 2/6) | **43 PASS** (6 files) |
| Consent + marketing events | **44 PASS** |
| `pnpm --filter @auto-platform/web typecheck` | **PASS** |
| eslint pe scope health | **PASS** |
| `next build` | **PASS** (după smoke standalone) |
| HTTP smoke A/B (`scripts/_smoke-phase7-seo-health.mts`) | **PASS** — consent, robots, sitemap clean, compara/salvate noindex, fără leak path |
| Live evaluator (cookie-less) | acme/beta: **0 critical** pe checks tehnice (warning tipic: OG neconfigurat în fixture minimal) |

**Fără** commit / push / deploy. **Phase 8 nu a început.**
