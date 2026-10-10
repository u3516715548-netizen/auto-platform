# Handoff — Etapa 23A: CMS + pagini legale + SEO de bază

## Meta
- Data: 10 octombrie 2026
- Workspace: `C:\Users\Wolf\dev\aplicatie-masini`
- Branch: `master` (lucru local, necomis)
- Bază: după Etapa 22 (`90dfebe`) + audit transversal (`2ebca7b`)
- Status: implementată local (migrare + UI + teste + build); **fără** commit / push / deploy
- Documente citite:
  - `docs/handoffs/README.md`
  - `docs/handoffs/audit-9-octombrie-2026.md`
  - `docs/handoffs/22-company-details.md`
  - `docs/security.md`
  - `docs/auth-tenancy.md`

## Obiectiv

CMS owner-only pentru pagini (inclusiv legale), rute publice `/p/[slug]` doar pentru `published`, SEO de bază per tenant, FORCE RLS, fără marketing/CMP/Merchant/sitemap.

## Scope livrat

- Tabel `tenant_pages` + enums status/kind
- Tabel `tenant_seo_settings` (1:1) + `app.public_seo_settings`
- Migrare `0013_tenant_pages_and_seo_settings`
- Server Actions: create / update / publish / unpublish / delete (owner-only)
- UI `/dashboard/settings/customization/pages` (+ edit + preview draft)
- Preferințe SEO în `/dashboard/settings/customization/preferences`
- Public `/p/[slug]` (Host → tenant, published only)
- Metadata catalog/detaliu/CMS cu defaults SEO + canonical
- Teste unit + RLS
- Handoff

## Schema

### `tenant_pages`

`id`, `tenant_id`, `slug`, `title`, `body`, `status` (`draft`|`published`), `page_kind` (`custom`|`about`|`contact`|`terms`|`privacy`|`cookies`), `locale` (`ro`), `seo_title`, `seo_description`, `published_at`, `created_at`, `updated_at`.

- Unique `(tenant_id, slug)`
- Slug format kebab; legale: `despre`, `contact`, `termeni`, `confidentialitate`, `cookies`
- Body sanitizat server-side (fără HTML/script/iframe/`javascript:`)

### `tenant_seo_settings`

`tenant_id` PK, `seo_title_default`, `seo_description_default`, `favicon_path`, `indexing_enabled`, timestamps.

Ales tabel separat (nu `tenants` / branding) — anon poate SELECT pe rândul `tenants`; SEO public trece prin SECURITY DEFINER.

## RLS

| Tabel | SELECT | Write |
|-------|--------|-------|
| `tenant_pages` | owner: toate; membru: published; anon: published pe tenant active\|trial | owner INSERT/UPDATE/DELETE |
| `tenant_seo_settings` | membru | owner INSERT/UPDATE; **fără** anon SELECT pe rând |

ENABLE + FORCE RLS. Teste `SET LOCAL ROLE` fără BYPASSRLS.

## Owner-only

- CMS + SEO settings: `requireRole(['owner'])` / `requireSettingsOwner`
- manager / sales / viewer: fără write (RLS + UI 404 pe settings)
- tenant_id doar din sesiune/Host; `rejectTenantIdFromForm`

## Public pages

- Rută: `/p/[slug]`
- Doar `published` → altfel 404
- Canonical `/p/{slug}`
- Title/description din page SEO → defaults tenant → fallback
- `indexing_enabled=false` → noindex
- Body afișat escaped (newline → `<br />`), fără HTML injectat

## SEO de bază

- Defaults pe catalog (păstrează query → canonical `/` + noindex)
- Detaliu vehicul: canonical `/vehicles/{slug}`
- Favicon opțional din SEO settings
- **Nu** sitemap / robots / JSON-LD / OG (23B)

## Audit

`cms.page.create|update|publish|unpublish|delete`, `seo.settings.create|update` — metadata cu slug/status/changedKeys; **fără** body complet.

## Teste

| Suită | Rezultat |
|-------|----------|
| `tenant-pages.isolation.test.ts` | RLS owner/anon/roles/Beta/SEO helper |
| `etapa23a-cms-seo.test.ts` | slug, sanitize, metadata, SEO schema |
| regresie storefront / Preview T1 | inclusă în suite web |

### Verificări rulate

```text
pnpm db:migrate   # OK — 0013
pnpm db:test      # OK — 90 passed
pnpm typecheck    # OK
pnpm --filter @auto-platform/web test   # OK — 289 passed
pnpm --filter @auto-platform/web build  # OK — rută /p/[slug]
```

## Ce rămâne pentru 23B

- `sitemap.xml` / `robots.txt` per Host
- JSON-LD (Organization / LocalBusiness / WebSite / Product)
- Open Graph / Twitter cards
- Folosire bogată `PublicCompanyView` în structured data

## Ce rămâne pentru 23C

- `tenant_marketing_integrations`
- GA4 / Ads / GTM / Meta Pixel+CAPI / TikTok Pixel+Events API
- CMP + Google Consent Mode
- Event registry (fără PII)
- Merchant feed

## Confirmare proces

- **Nu** s-a făcut commit
- **Nu** s-a făcut push
- **Nu** s-a făcut deploy
- Oprire înainte de verificare finală separată
