# QA Matrix — Marketing + SEO + Consent + Tracking (Phases 2–7)

**Data:** 2026-10-16
**Scope:** verificare manuală pre-Production. Nu înlocuiește smoke-urile automate.

Legendă: `[ ]` de bifat de owner / QA.

---

## A. Public tenant (Host `{slug}.{ROOT}`)

| # | Check | ACME | Beta | Note |
|---|-------|------|------|------|
| A1 | Homepage 200, brand vizibil, catalog | [ ] | [ ] | |
| A2 | Filtre catalog (make/fuel/price) | [ ] | [ ] | URL cu query → noindex |
| A3 | Vehicle detail 200, galerie, CTA lead/finance | [ ] | [ ] | |
| A4 | CMS `/p/{slug}` published | [ ] | [ ] | |
| A5 | Landing inventory cu rezultate | [ ] | [ ] | |
| A6 | `/compara` funcțional + **noindex** | [ ] | [ ] | view-source |
| A7 | `/salvate` funcțional + **noindex** | [ ] | [ ] | |
| A8 | Lead contact submit (sau noop pe demo) | [ ] | [ ] | |
| A9 | Finance flow submit | [ ] | [ ] | |
| A10 | Draft `/p/{draft}` **nu** public 200 | [ ] | [ ] | |

---

## B. Consent

| # | Check | Pass? |
|---|-------|-------|
| B1 | First visit: banner vizibil, fără GTM/gtag/pixeli în Network | [ ] |
| B2 | Reject all: cookie `ab_consent`, analytics/marketing false, fără scripturi | [ ] |
| B3 | Accept analytics only: GTM sau GA4 după plan; fără Meta/TikTok/LinkedIn (dacă fără GTM) | [ ] |
| B4 | Accept marketing only: ads/pixeli OK; GA4 direct doar dacă analytics | [ ] |
| B5 | Accept all: runtime pornește | [ ] |
| B6 | Preferințe → schimbare → update Consent Mode | [ ] |
| B7 | Refresh păstrează consimțământul | [ ] |
| B8 | ACME vs Beta: cookie **fără** `Domain=` root (izolare Host) | [ ] |
| B9 | HTTPS: cookie are flag `Secure` | [ ] |

---

## C. Marketing config

| # | Scenario | Pass? |
|---|----------|-------|
| C1 | GTM configurat + enabled → după consent, `gtm.js`; **fără** GA4 direct | [ ] |
| C2 | Doar GA4 (fără GTM) → `gtag/js` după analytics | [ ] |
| C3 | Fără IDs → runtime idle, banner tot prezent | [ ] |
| C4 | Integration disabled (`gtm_enabled=false`) → nu se încarcă | [ ] |
| C5 | Verification tokens în homepage meta când configurate | [ ] |
| C6 | Verification lipsă → fără meta false | [ ] |
| C7 | Dashboard Marketing: doar **owner** | [ ] |

---

## D. Security

| # | Check | Pass? |
|---|-------|-------|
| D1 | Owner: Marketing / SEO Health / CMS OK | [ ] |
| D2 | Member/manager: `/dashboard/settings/marketing*` → 404 | [ ] |
| D3 | Unauthenticated: redirect login | [ ] |
| D4 | Tenant A dashboard nu arată date tenant B | [ ] |
| D5 | Host ACME vs Beta: HTML/sitemap diferit | [ ] |
| D6 | Form cu `tenant_id` forged → respins (`rejectTenantIdFromForm`) | [ ] |
| D7 | Direct server action ca non-owner → denied | [ ] |

---

## E. SEO

| # | Check | Pass? |
|---|-------|-------|
| E1 | View-source: title, description, canonical absolut pe Host | [ ] |
| E2 | `/robots.txt` per Host; `indexingEnabled=false` → Disallow / | [ ] |
| E3 | `/sitemap.xml` per tenant; fără `/compara` `/salvate` `/dashboard` query | [ ] |
| E4 | Catalog `?…` → robots noindex, canonical `/` | [ ] |
| E5 | JSON-LD Organization/WebSite pe homepage | [ ] |
| E6 | Product/Offer pe PDP: fără VIN, fără signed image URLs | [ ] |
| E7 | FAQPage doar dacă FAQ vizibil; ItemList doar dacă listă inventar vizibilă | [ ] |
| E8 | Canonical override invalid → fallback self `/p/{slug}` | [ ] |
| E9 | noindex page **absent** din sitemap; indexable published **prezent** | [ ] |
| E10 | Marketing → SEO Health: issues explicabile, fără Google score | [ ] |

---

## Automat (deja rulat local Phase 8)

- Unit Phases 2–7 scope: **90 PASS**
- RLS marketing/SEO/pages: **12 PASS**
- Smoke Phase 6 + 7 A/B: **PASS**
- typecheck web: **PASS**
