# Handoff 32 — Final QA / Production Readiness (Phase 8)

**Data:** 2026-10-16 (Europe/Bucharest)
**Status:** DONE — audit + docs; release commit/push pe GitHub când owner cere (fără deploy / migrări Prod / DNS)
**Depinde de:** Phases 2–7 APROBATE
**Urmează:** Deploy Production doar după `PRODUCTION-DEPLOYMENT-RUNBOOK.md` + aprobare owner — **nu există Phase 9 în acest lanț**

Documente companion:
- [`docs/QA-MARKETING-SEO.md`](../QA-MARKETING-SEO.md)
- [`docs/PRODUCTION-READINESS-MARKETING.md`](../PRODUCTION-READINESS-MARKETING.md)
- [`docs/PRODUCTION-DEPLOYMENT-RUNBOOK.md`](../PRODUCTION-DEPLOYMENT-RUNBOOK.md) — procedură executabilă pre-deploy
- Plan: [`docs/MARKETING-SEO-TRACKING-PLAN.md`](../MARKETING-SEO-TRACKING-PLAN.md)

---

## 1. Audit summary

Lanțul **SEO Core → Marketing Settings → Consent → Tracking Runtime → Events → Content SEO → SEO Health** a fost auditat pe cod + teste + smoke A/B.

**Verdict:** ready pentru **pregătire Production** din punct de vedere al implementării locale.
**Nu** este „deploy acum” până nu sunt confirmate: migrări Prod (0016–0019+), DNS wildcard, env fără Hobby demo, GSC/CWV post-go-live.

Nu s-au găsit **critical** de tip leak cross-tenant sau bypass owner pe path-urile Marketing/SEO/CMS verificate.
Există **warning**-uri operaționale (CSP absent, env/DNS/migrări Prod, CWV/GSC doar post-deploy).

---

## 2. Findings (Critical / Warning / Pass)

### Critical (blocante deploy multi-tenant real)

| ID | Finding | Status |
|----|---------|--------|
| C1 | Migrări `0016`–`0019` pe **Production DB** | **needs_manual_confirmation** — local present |
| C2 | `HOBBY_DEMO_ONLY` trebuie **OFF** pe custom domain multi-tenant | **config gate** — nu lăsa Hobby pe Prod real |
| C3 | Wildcard DNS `*.{ROOT}` + HTTPS pe tenant hosts | **needs_manual_confirmation** |

*(Niciun bug de cod critical demonstrat în lanțul Phase 2–7 la audit.)*

### Warning (recomandat înainte / imediat după deploy)

| ID | Finding | Severitate |
|----|---------|------------|
| W1 | **CSP headers absente** în app — script sources doar prin code allowlist | Warning |
| W2 | `LEAD_RATE_LIMIT_SECRET` recomandat pe URL public | Warning |
| W3 | SEO Health live fetch pe serverless: setează `SEO_HEALTH_FETCH_BASE` dacă Host self-fetch eșuează | Warning |
| W4 | Cu **GTM**: pixeli Meta/TikTok/Ads trebuie gestionați **în GTM** + Consent Mode — runtime direct e dezactivat (by design) | Warning operațional |
| W5 | Core Web Vitals / GSC / Rich Results **nu** pot fi validate complet local | Warning (post-launch) |
| W6 | Organization/LocalBusiness fără adresă completă poate genera warning-uri schema (nu critical app) | Warning SEO conținut |

### Pass (verificat)

| ID | Check |
|----|-------|
| P1 | Host = sursă tenant; `tenant_id` din form respins |
| P2 | RLS FORCE pe `tenant_pages`, `tenant_seo_settings`, `tenant_marketing_integrations` |
| P3 | Public helpers SECURITY DEFINER whitelist (`public_seo_settings`, `public_marketing_integrations`) |
| P4 | Owner-only pages + actions Marketing / CMS / SEO Health |
| P5 | Audit log marketing: doar `configuredKeys`, **fără** valori brute ID |
| P6 | Fără custom script injection v1 |
| P7 | Consent-gated GTM/GA4/pixeli; GTM-first fără dublu GA4 direct |
| P8 | Cookie `ab_consent` host-only; Secure pe HTTPS |
| P9 | `/compara` `/salvate` noindex; sitemap fără utility/dashboard/query (`<loc>` only) |
| P10 | Product JSON-LD fără VIN / signed URLs (teste Phase 2) |
| P11 | Smoke A/B + unit 90 + RLS 12 PASS (Phase 8 run) |

---

## 3. Security findings

| Temă | Rezultat |
|------|----------|
| Izolare A/B | PASS — Host + RLS tests; smoke HTML/sitemap lengths diferă |
| Public helpers | PASS — doar câmpuri whitelist; marketing table **fără** GRANT anon |
| Permissions | PASS — `requireSettingsOwner` / `requireRole(owner)` pe UI + actions; UI hide nu e singura protecție |
| Secrets în audit | PASS — keys names only |
| Verification public | PASS by design — meta pe homepage când configurate |
| Script safety | PASS — no arbitrary HTML; consent gate; GTM-first |
| CSP | **MISSING** — warning W1 |

---

## 4. SEO findings

| Temă | Rezultat |
|------|----------|
| Metadata builders catalog/vehicle/CMS | PASS (unit + smoke) |
| Canonical absolut pe Host | PASS (`public-origin`) |
| Invalid canonical override → self | PASS (Phase 6) |
| robots / sitemap per Host | PASS smoke |
| noindex utility + query catalog | PASS |
| draft/archived not public | PASS (RLS + smoke preview) |
| Sitemap eligibility vs noindex | PASS (Phase 6/7) |
| FAQ / ItemList conditional | PASS (contract Phase 6) |
| VIN / signed URLs | PASS |
| SEO Health | PASS — owner-only; false positive `<?xml` reparat |

---

## 5. Production configuration checklist

Vezi tabel complet: [`docs/PRODUCTION-READINESS-MARKETING.md`](../PRODUCTION-READINESS-MARKETING.md).

Highlights:
- Env Supabase + `ROOT_DOMAIN` + `APP_URL` → confirm Prod
- Migrări 0013–0019 → confirm Prod
- Hobby demo flags → OFF pe multi-tenant
- Wildcard + HTTPS → confirm
- CSP → absent (plan post-launch)

---

## 6. Manual QA matrix

[`docs/QA-MARKETING-SEO.md`](../QA-MARKETING-SEO.md) — secțiuni A–E.

---

## 7. External validation plan (post-deploy)

1. **Search Console** — verify property; submit sitemap; URL Inspection (indexed + **Test live URL**) pe homepage, catalog, vehicle, CMS.
2. **Structured data** — Rich Results / URL Inspection Enhancements; warnings vs errors; markup = conținut vizibil.
3. **CWV** — mobile + desktop; baseline LCP/INP/CLS (Good: ≤2.5s / ≤200ms / ≤0.1).
4. **GTM Preview** — consent init → update; no-fire pre-consent; no duplicate events.

Surse: [URL Inspection](https://support.google.com/webmasters/answer/9012289), [CWV report](https://support.google.com/webmasters/answer/9205520).

---

## 8. Release checklist

- [ ] Local migrations applied (journal through `0019`)
- [ ] Production migration plan executed (0013–0019 as needed)
- [ ] No secrets committed (`git status` clean of `.env`)
- [ ] Prod env verified (Supabase, ROOT_DOMAIN, APP_URL, media)
- [ ] `HOBBY_DEMO_*` unset on real Prod
- [ ] RLS verified (re-run isolation suite against Prod-like DB or staging)
- [ ] `pnpm --filter @auto-platform/web typecheck` PASS
- [ ] Unit Phases 2–7 PASS
- [ ] Smoke Phase 6 + 7 PASS
- [ ] `next build` PASS
- [ ] Public domains + wildcard DNS + HTTPS verified
- [ ] `/robots.txt` + `/sitemap.xml` reachable on tenant Hosts
- [ ] Rollback: previous deployment + DB snapshot
- [ ] Owner test accounts tenant A + B
- [ ] Post-deploy: GSC + GTM Preview + CWV baseline

---

## 9. Ready for deploy (code)

- Phases 2–7 implementate și APROBATE
- Phase 8 audit + docs complete
- Automated checks local: **PASS** (vezi §11)

## 10. Must resolve before deploy

1. Confirm / apply DB migrations on Production
2. Confirm DNS wildcard + HTTPS + `NEXT_PUBLIC_ROOT_DOMAIN` / `APP_URL`
3. Ensure Hobby demo mode is **not** active on multi-tenant Prod
4. Owner completes manual QA matrix (cel puțin A/B/D smoke pe staging)
5. Per-tenant: GTM/verification IDs dacă dealerii le folosesc

## 11. Automated verification (Phase 8 run)

| Suite | Result |
|-------|--------|
| Unit (seo/cms/marketing/consent/nav/host) | **90 PASS** / 11 files |
| RLS isolation (pages + marketing + public helper) | **12 PASS** |
| typecheck `@auto-platform/web` | **PASS** |
| Smoke `_smoke-phase6-cms-seo.mts` | **PASS** |
| Smoke `_smoke-phase7-seo-health.mts` | **PASS** (ACME 10 locs / Beta 3 locs) |

## 12. Post-launch remaining

- CSP headers (hardening)
- Search Console monitoring + indexing coverage
- CWV field data (28-day CrUX)
- Optional: SEO Health history / cron (nu în v1)
- Optional: platform kill-switch env (nu implementat)
- Apex Autobear marketing (explicit out of scope)
- AI / bulk landing / Search Console API (out of scope)

---

## Fișiere Phase 8 (docs only)

- `docs/handoffs/32-final-qa-production-readiness.md` (acest fișier)
- `docs/QA-MARKETING-SEO.md`
- `docs/PRODUCTION-READINESS-MARKETING.md`
- `docs/MARKETING-SEO-TRACKING-PLAN.md` (status Phase 8)
- Link din handoff 31 → acest document
