# Production Readiness — Marketing + SEO + Consent + Tracking

**Data:** 2026-10-16
**Scope:** Phases 2–7 + Phase 8 audit. **Fără valori secrete inventate.**
**Runbook executabil:** [`PRODUCTION-DEPLOYMENT-RUNBOOK.md`](./PRODUCTION-DEPLOYMENT-RUNBOOK.md)

Statusuri: `present` | `missing` | `needs_manual_confirmation` | `safe_default`

---

## 1. Environment & platform

| Item | Status | Note |
|------|--------|------|
| `DATABASE_URL` | needs_manual_confirmation | Present local (`.env.local`); confirm Session pooler + **fără BYPASSRLS** pe runtime |
| `DATABASE_URL_MIGRATIONS` | safe_default / optional | Doar pentru migrări; nu pe request path |
| `NEXT_PUBLIC_SUPABASE_URL` | needs_manual_confirmation | Present local; confirm Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | needs_manual_confirmation | Present local; confirm Production |
| `SUPABASE_SERVICE_ROLE_KEY` | needs_manual_confirmation | Present local; **doar** media signed URLs — niciodată pe path user public |
| `NEXT_PUBLIC_APP_URL` | needs_manual_confirmation | Local `http://localhost:3000`; Prod ex. `https://www.autobear.ro` |
| `NEXT_PUBLIC_ROOT_DOMAIN` | needs_manual_confirmation | Local `localhost:3000`; Prod bare root (ex. `autobear.ro`) — **nu** `www.` ca root pentru tenants |
| `NEXT_PUBLIC_MEDIA_BUCKET` | safe_default | Default `vehicle-media` dacă lipsește |
| `LEAD_EMAIL_PROVIDER` | safe_default | `noop` dacă lipsă |
| `LEAD_RATE_LIMIT_SECRET` | missing / recommended | Recomandat pe URL public |
| Billing Stripe vars | needs_manual_confirmation | Doar dacă self-serve checkout e ON |
| `HOBBY_DEMO_ONLY` | **must be unset/false** on real Prod | Pe multi-tenant custom domain: **OFF** |
| `HOBBY_DEMO_TENANT_SLUG` | must be unset on real Prod | |
| `SEO_HEALTH_FETCH_BASE` / `SMOKE_BASE` | safe_default | Default `http://127.0.0.1:3000` local; pe Prod set absolute origin dacă live health fetch eșuează |
| Secrets în git | present (protected) | `.env*` / `.vercel` în gitignore — verify pre-release |

---

## 2. Domains / DNS / HTTPS

| Item | Status | Note |
|------|--------|------|
| Apex `www` + redirect bare → www | needs_manual_confirmation | Conform `.env.example` |
| Wildcard `*.{ROOT}` | needs_manual_confirmation | Obligatoriu pentru `{slug}.{ROOT}` |
| HTTPS pe apex + tenants | needs_manual_confirmation | Consent cookie setează `Secure` doar pe HTTPS |
| Vercel Domains / certificates | needs_manual_confirmation | Fără `vercel.json` în repo — setări în Project UI |
| Node 20.x pe Vercel | needs_manual_confirmation | Vezi `docs/stages/12-hardening-deploy.md` |
| Build command | present (docs) | `pnpm --filter @auto-platform/web build` |
| Root Directory monorepo `.` | needs_manual_confirmation | |

---

## 3. Database migrations (Marketing/SEO chain)

| Migration | Local journal | Production |
|-----------|---------------|------------|
| `0013` tenant_pages + seo_settings | present | needs_manual_confirmation |
| `0016` SEO OG / public_seo_settings | present | needs_manual_confirmation |
| `0017` tenant_marketing_integrations | present | needs_manual_confirmation |
| `0018` public_marketing_integrations | present | needs_manual_confirmation |
| `0019` tenant_pages SEO landing | present | needs_manual_confirmation |

**Plan Prod:** aplică migrările în ordine pe DB Prod (`DATABASE_URL_MIGRATIONS` / owner role) **înainte** de traffic pe features noi; rollback = restore snapshot DB + redeploy previous app SHA.

---

## 4. Auth / cookies / tenancy

| Item | Status | Note |
|------|--------|------|
| Host → tenant | present | `resolveTenantSlugFromHost`; client `tenant_id` respins |
| Supabase Auth cookies | needs_manual_confirmation | Site URL + redirect allowlist pe domeniul Prod |
| Consent cookie `ab_consent` | present | Host-only (no Domain=), SameSite=Lax, Secure pe HTTPS |
| Owner-only Marketing/CMS/Health | present | Pages + server actions |

---

## 5. CSP / script sources

| Item | Status | Note |
|------|--------|------|
| Content-Security-Policy headers | **missing** | Nu există CSP dedicat în app v1 — **warning** pre-Prod / post-launch |
| Script allowlist de facto | present (code) | Doar GTM / gtag / Meta / TikTok / LinkedIn din runtime gated |
| Custom HTML/script injection | present (absent by design) | NU în v1 |

Surse tipice de adăugat într-un CSP viitor (nu configurat acum):
`https://www.googletagmanager.com`, `https://www.google-analytics.com`, `https://connect.facebook.net`, `https://analytics.tiktok.com`, `https://snap.licdn.com`.

---

## 6. Per-tenant marketing (manual, nu env)

| Item | Status |
|------|--------|
| GTM / GA4 / Ads / pixeli | needs_manual_confirmation per dealer (dashboard Marketing) |
| Search Console / Bing / Meta / Pinterest verification | needs_manual_confirmation per dealer |
| `indexing_enabled` + OG defaults | needs_manual_confirmation (Preferințe SEO) |
| CMS landing published + sitemap | needs_manual_confirmation |

---

## 7. Release checklist (scurt)

Vezi detalii complete în `docs/handoffs/32-final-qa-production-readiness.md`.

- [ ] Migrări 0013–0019 pe Prod
- [ ] Env Prod verificate (fără Hobby demo)
- [ ] Wildcard DNS + HTTPS
- [ ] Build / typecheck / tests / smoke local PASS
- [ ] RLS re-verified pe Prod (smoke SQL sau suite isolation)
- [ ] Conturi owner A/B
- [ ] Rollback plan agreat
- [ ] GSC + sitemap după go-live

---

## 8. External validation (post-deploy)

1. **Google Search Console** — property Domain sau URL-prefix pe Host tenant; verify tag; submit `https://{slug}.{root}/sitemap.xml`; URL Inspection pe `/`, catalog, vehicle, `/p/…` ([docs](https://support.google.com/webmasters/answer/9012289)).
2. **Rich Results / structured data** — homepage Org/WebSite; PDP Product; landing FAQ/ItemList doar dacă vizibile.
3. **Core Web Vitals** — ținte Good: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 ([docs](https://support.google.com/webmasters/answer/9205520)).
4. **GTM Preview** — consent default denied → update → tags; fără fire pre-consent; fără dubluri GTM+GA4 direct.
