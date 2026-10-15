# Handoff 30 — Content SEO / Landing Pages (Phase 6)

**Data:** 2026-10-16 (Europe/Bucharest)
**Status:** DONE local — fără commit / push / deploy
**Depinde de:** Phase 2 SEO Core + Etapa 23A CMS
**Urmează:** Phase 7 SEO Health — vezi `docs/handoffs/31-seo-health-validation.md`

---

## Decizii confirmate

1. Extindem `tenant_pages` (nu tabel separat)
2. Inventory 0 rezultate → **block publish**
3. UI la Personalizare → Pagini (+ link scurt Marketing → SEO)
4. `canonical_path` relativ în DB; absolut pe Host la render; fără URL absolut liber

---

## Migrare

`packages/db/drizzle/0019_tenant_pages_seo_landing.sql` — **aplicată local**

- `tenant_page_status` += `archived`
- `tenant_page_kind` += inventory / financing / buyback / warranty / service
- Coloane: `h1`, `intro`, `cta_*`, `og_image_path`, `canonical_path`, `noindex`, `include_in_sitemap`, `faq`, `catalog_filters`, `internal_links`, `updated_by`

RLS neschimbat: owner write; public SELECT doar `published`.

---

## Reguli indexare

| Conditie | Public | robots | Sitemap |
|----------|--------|--------|---------|
| draft / archived | nu | — | nu |
| published + noindex | da | noindex | nu |
| published + ¬self-canonical | da | după noindex | **nu** |
| published + indexable + include_in_sitemap + self-canonical | da | index* | da |

\* și `tenant_seo_settings.indexing_enabled`.

`/compara`, `/salvate`, query catalog — neschimbate (Phase 2).

---

## Fișiere cheie

- `packages/types/src/cms-landing.ts` — path/canonical/filters/publish gates
- `packages/types/src/index.ts` — enums + create/update schemas extinse
- `packages/db/src/schema/tenant-pages.ts` + enums
- `apps/web/src/lib/cms/*` — loaders, actions, publish gates, inventar count
- `apps/web/src/lib/seo/list-public-sitemap-entries.ts`
- `apps/web/src/lib/seo/build-page-metadata.ts` / `build-json-ld.ts`
- `apps/web/src/app/p/[slug]/page.tsx` — H1, intro, CTA, FAQ, inventar, JSON-LD
- Dashboard CMS forms + preview noindex
- Smoke: `apps/web/scripts/_smoke-phase6-cms-seo.mts`

---

## Teste

- Unit Phase 6 + CMS/SEO/consent/events: **47 PASS**
- RLS `tenant-pages.isolation`: **6 PASS**
- typecheck types/db/web: **PASS**
- HTTP smoke Phase 6 + Phase 4 regression: **PASS**

---

## Limitări

- Editor FAQ/filters/links = JSON textareas (nu page builder vizual)
- ItemList doar pe tipuri inventory cu vehicule vizibile
- Footer legal linking automat — încă manual via CMS/internal_links
- Fără AI / bulk generation
- Preview nu rulează storefront marketing runtime (dashboard layout)

---

## Phase 7 (așteaptă aprobare)

SEO health checks: missing title/H1/OG, noindex greșit, sitemap gaps, vehicles fără imagine, etc.
