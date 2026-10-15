# Handoff 28 — Consent & Tracking Runtime Foundation (Phase 4)

**Data:** 2026-10-16 (Europe/Bucharest)
**Status:** DONE local — fără commit / push / deploy
**Depinde de:** Phase 3 Marketing Settings (`tenant_marketing_integrations`)
**Urmează:** Phase 5 Event Taxonomy (`generate_lead`, etc.)

---

## Arhitectură

| Piesă | Locație |
|-------|---------|
| Public whitelist | `app.public_marketing_integrations(uuid)` + `loadPublicMarketingIntegrations` |
| Consent state | `lib/consent/consent-state.ts` — cookie host-only `ab_consent` |
| Consent Mode v2 | defaults denied în client runtime **înainte** de tag-uri; update la choice |
| Banner SSR | `ConsentBannerSsr` (cookies()) — copy în HTML fără JS |
| Banner client | `ConsentBanner` — Accept / Reject / Customize + reopen |
| Loaders | `StorefrontMarketingRuntime` (next/script gated) |
| Wire | `PublicStorefrontShell` (async) — **nu** saas-shell / apex |
| Verification | `buildVerificationMetadata` pe homepage `app/page.tsx` |
| Phase 5 stub | `lib/marketing/events-contract.ts` |

## Persistare consent — de ce host-only cookie

- Fiecare dealer = Host `{slug}.autobear.ro`.
- Cookie **fără** `Domain=` → izolat pe Host → zero leak între tenants.
- `Domain=.autobear.ro` ar partaja consent între dealeri (interzis).
- Payload: `{version, preferences, analytics, marketing, updatedAt}` — fără PII.

## Ce se încarcă și când

| Tag | Condiție |
|-----|----------|
| GTM | ID + enabled + (analytics **sau** marketing consent). Dacă GTM → **doar** GTM. |
| GA4 direct | fără GTM + analytics consent + ID |
| Google Ads direct | fără GTM + marketing + ID |
| Meta / TikTok / LinkedIn | fără GTM + marketing + ID |
| Verification meta | pe homepage dacă token configurat (nu e script; nu cere consent) |

## Ce NU e în Phase 4

- Event taxonomy live (`generate_lead` doar contract)
- Custom head/body scripts
- CMP pe apex Autobear
- Setări editabile banner în dashboard (`tenant_consent_settings`)
- Advanced Consent Mode (region lists)

## Teste

- Unit consent/load plan: 10 PASS
- Unit marketing + SEO regression: OK
- RLS public marketing helper: 3 PASS
- typecheck web: PASS
- HTTP smoke: banner SSR, GSC A/B izolat, fără GTM înainte de consent, compara noindex

## Limitări / edge cases

- Client runtime nu SSR-uiește bannerul în flight (de aceea există `ConsentBannerSsr`).
- GTM cu doar marketing consent tot încarcă containerul (tag-urile din GTM trebuie configurate cu Consent Mode în GTM).
- Linkuri `/p/cookies` și `/p/confidentialitate` pot 404 dacă dealerul nu a publicat CMS.
- Cookie `ab_consent` citit pe server via `cookies()` — pe CDN/cache trebuie evitat cache full HTML personalizat pe cookie (homepage are revalidate scurt; banner SSR e pe shell dinamic).
