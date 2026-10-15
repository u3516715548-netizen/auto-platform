# Handoff 27 — Marketing Settings Center (Phase 3)

**Data:** 2026-10-15 (Europe/Bucharest)
**Status:** DONE local — fără commit / push / deploy
**Depinde de:** Phase 2 SEO Core (aprobat smoke)
**Urmează:** Consent (Phase 5) înainte de Tracking live (Phase 4)

---

## Ce s-a livrat

- Tabel `tenant_marketing_integrations` (1:1 tenant) + migrare `0017`
- RLS FORCE, **owner-only** SELECT/INSERT/UPDATE/DELETE; **fără** GRANT anon; **fără** public function
- Dashboard top-level **Marketing**: Overview, SEO (bridge → Preferințe), Analytics & Ads, Verification
- Zod validators pentru GTM / GA4 / Ads / Meta / TikTok / LinkedIn + verification tokens
- Server action `upsertMarketingIntegrationsAction` (owner, reject `tenant_id`, audit fără valori brute)
- Teste unit + RLS isolation

## Ce NU s-a livrat (intenționat)

- Încărcare GTM/GA/pixels pe storefront
- Consent banner / Consent Mode
- Custom head/body scripts
- Event taxonomy / generate_lead
- SEO Health / Reports
- Mutarea formularului SEO din Preferințe (doar link dual)

## Schema (câmpuri)

Tracking IDs + toggles: `gtm_*`, `ga4_*`, `google_ads_*` (id + label), `meta_pixel_*`, `tiktok_pixel_*`, `linkedin_*`
Verification: `google_search_console_verification`, `bing_webmaster_verification`, `meta_domain_verification`, `pinterest_verification`

## Permissions

- Rol administrativ = `owner` (nu există `admin`)
- Non-owner: nav ascuns + `requireSettingsOwner` → 404
- RLS: member/sales/viewer/anon → 0 rows; cross-tenant → 0 rows

## Verificări rulate

- `pnpm db:migrate` → 0017 OK
- Unit marketing 8 PASS; SEO core regression 9 PASS
- RLS marketing 3 PASS
- `pnpm --filter @auto-platform/web typecheck` PASS
- Lint: erori preexistente pe storefront/nav effects (neschimbate ca intent); fără tracking runtime în `src/`

## Limitări

- Formulare Analytics vs Verification fac upsert full-row (hidden fields păstrează cealaltă secțiune)
- Verification meta tags nu sunt încă emise în `<head>` public
- `enabled` flags sunt pregătire pentru Phase 4/5 — fără efect runtime acum
