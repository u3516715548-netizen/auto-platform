# Handoff — Audit 9 Octombrie 2026

## Meta
- Data: 9 octombrie 2026
- Workspace: `C:\Users\Wolf\dev\aplicatie-masini`
- Branch: `master`
- HEAD la momentul auditului: `5bf456d` — *Add Stage 21 team invitations with owner-only roles and hashed tokens.*
- Commit anterior relevant: `8ee603e` — Etapa 20 RLS real (fără BYPASSRLS)
- Status: **audit / plan read-only** pentru Etapele 22–24; Etapa 21 livrată (commit + push); **fără** implementare 22/23/24; **fără** commit al acestui handoff până la cerere
- Tip document: handoff transversal de audit (nu înlocuiește `NN-….md` pe etapă)
- Documente citite:
  - `docs/handoffs/README.md`
  - `docs/handoffs/20-rls-security-hardening.md`
  - `docs/handoffs/21-team-invitations-roles.md`
  - `HANDOFF_Functionalitati.md`
  - `HANDOFF_Status_Actual_Aplicatie_Auto_Platform.md`
  - `docs/database.md`
  - `docs/security.md`
  - `docs/auth-tenancy.md`
  - `docs/architecture.md`
  - starea reală din repo (schema, UI settings, storefront, registry teme)

## Obiectiv

Consolida într-un singur loc:
1. starea livrată Etapa 21 + verificarea deployment Production;
2. auditul și planul Etapei 22 (detalii firmă);
3. auditul și planul Etapei 23 (CMS + SEO + marketing integrations);
4. auditul și planul Etapei 24 (Template 2);
5. conflictele de roadmap și dependențele între etape.

## Scope-ul sesiunii

| Activitate | Tip | Rezultat |
|---|---|---|
| Etapa 21 — Team invitations + roles | Implementare anterioară + commit/push | Pe `master` @ `5bf456d` |
| Verificare deployment `5bf456d` | Read-only (GitHub/Vercel status + smoke public) | Production `success`; smoke public OK |
| Etapa 22 — Detalii firmă | Audit read-only + plan | Așteaptă aprobare implementare |
| Etapa 23 — CMS + SEO + Marketing | Audit read-only + plan | Așteaptă aprobare; README încă listează doar CMS+SEO |
| Etapa 24 — Template 2 | Audit read-only + plan | Așteaptă aprobare |

## Ce nu s-a făcut în această sesiune de audit

- Nu s-a implementat Etapa 22 / 23 / 24
- Nu s-au creat migrări, RLS, seed, UI noi (în afară de acest handoff, la cerere)
- Nu s-au modificat `.env.local`, Vercel, Hobby gating
- Nu s-a făcut email real / Resend
- Nu s-au creat invitații sau membri reali în Production la smoke
- Nu s-a renumerotat roadmap-ul
- Nu există încă `docs/handoffs/22-company-details.md` (Etapa 22 neimplementată)

---

## A. Stare livrată — Etapa 21

### Commit
- Hash scurt: `5bf456d`
- Hash complet: `5bf456d129425f6e2bfd1e386b1244ce501fd56d`
- Mesaj: `Add Stage 21 team invitations with owner-only roles and hashed tokens.`
- Push: `origin/master` (`8ee603e..5bf456d`)

### Conținut esențial
- Tabel `tenant_invitations` + migrări `0009`–`0011`
- Owner-only: invite / revoke / resend / change role / remove
- Roluri invitabile: `manager` | `sales` | `viewer` (fără `admin`, fără invite la `owner`)
- Token ≥256 biți, doar hash în DB, TTL 7 zile, single-use
- Accept: login + signup controlat; helpers SECURITY DEFINER înguste
- Email invitație: **noop/log** (fără inbox real)
- RLS teste fără BYPASSRLS (pattern Etapa 20)
- UI: `/dashboard/settings/team`, `/invite/[token]`
- Handoff etapă: `docs/handoffs/21-team-invitations-roles.md`

### Deployment Production (`5bf456d`)
- GitHub/Vercel status: **success** („Deployment has completed”)
- Dashboard Vercel (din status GitHub): proiect `autofyro/auto-platform`
- Demo stabil documentat: `https://auto-platform-beige.vercel.app`
- Alias deployment efemer din API a răspuns 404 public; site-ul stabil a răspuns OK
- Smoke non-destructive: homepage ACME + catalog, team→login, invite invalid/indisponibil neutru, login OK
- **Neverificat în Production** (intenționat): creare invitație, accept real, role/remove, last-owner (ar crea date)

### Limitări Etapa 21 (rămân)
- Email invitație noop/log
- Signup depinde de confirmarea email Supabase
- Emailuri colegi pot lipsi (`profiles_select_own`)
- Rate limit in-memory

---

## B. Audit Etapa 22 — Detalii complete firmă

### Status
Plan read-only. **Neimplementată.** Fără handoff `22-….md` până la livrare.

### Ce există
- `tenants`: name, slug, status, plan, custom_domain, branding jsonb
- Public DTO: name, slug, primaryColor, templateId, phone?, whatsapp?
- Privat în branding: `leadNotificationEmails`
- UI Company (owner): doar salvare **nume comercial**
- Contact public la Personalizare → Preferințe
- Template 1 footer: nume + phone/WhatsApp
- RLS tenants: FORCE; SELECT public anon pe `active|trial` (rând întreg la nivel Postgres)

### Ce lipsește
- Denumire legală, CUI, Reg. Comerțului, adrese, program, email public, website/social, logo, monedă tenant, date bancare
- Entitate dedicată company; JSON-LD; pagini legale (→ 23)

### Arhitectură recomandată
- Tabel separat `tenant_company_profiles` (1:1), **nu** CUI/IBAN pe `tenants`/`branding` (policy anon SELECT pe tenants)
- Public vs private explicite; DTO `PublicCompanyView`
- Owner-only mutate; FORCE RLS; fără anon SELECT pe profilul firmă
- Audit `company.profile.update` fără secrete în metadata

### Clasificare (rezumat)

| Zonă | Etapa |
|---|---|
| Identitate legală, adresă, program, email public, social, logo, monedă | **22** |
| Termeni / Privacy / Cookies / SEO prefs / Merchant | **23** |
| IBAN | intern 22 sau defer; **niciodată public** |

### Nu intră în 22
CMS, SEO, Merchant, marketing pixels, Template 2, Expo, email real, cron, Vercel/env.

---

## C. Audit Etapa 23 — CMS + SEO + Marketing integrations

### Status
Plan read-only. README încă listează Etapa 23 ca `23-pages-cms-seo` (CMS+SEO). Handoff-urile 20/21 cer **Etapa 23 actualizată** = CMS + SEO + **marketing**. Nu s-a renumerotat automat.

### Ce există
- SEO catalog minimal (index `/`, query → noindex + canonical `/`)
- Metadata title/description pe home/detaliu
- Consent doar pe formulare lead/finance (nu CMP cookies)
- Placeholdere UI: Pagini CMS, Preferințe SEO/analytics
- Zero: GA4, GTM, Ads, Meta, TikTok, Merchant feed, sitemap/robots App Router, JSON-LD, cookie banner

### Propuneri cheie
1. **CMS:** `tenant_pages` — slug, title, body, draft/published, locale `ro`; pagini legale tip
2. **SEO:** seo_title/description, favicon, sitemap/robots, OG, JSON-LD Organization/LocalBusiness/WebSite/Product (LocalBusiness depinde de Etapa 22)
3. **Merchant:** feed per tenant, doar `available`, date complete, izolare Host
4. **Marketing:** `tenant_marketing_integrations` — provider, enabled, public_id, secret_ref, consent_category, config; **fără** ID-uri globale hardcodate
5. **CMP:** categorii necessary/analytics/marketing; Consent Mode ca complement, nu înlocuitor; zero tracking înainte de consent; fără PII în evenimente
6. **Event registry:** `page_view`, `view_item`, `generate_lead`, `finance_application`, `reservation_start`, `reservation_complete`, `contact`
7. **Permisiuni:** configurare owner-only (fără rol `admin`)

### Dependențe
- Etapa 22 (date firmă) pentru structured data bogate
- Etapa 21 (owner/roles) — OK
- Email real / cron rezervări — în afara Etapei 23

### Nu intră în 23
Email Resend, CAPTCHA, Redis, Template 2, Expo, cron, implementare 22 „pe furiș”, tracking fără consent.

---

## D. Audit Etapa 24 — Template 2

### Status
Plan read-only. Template 2 = `coming_soon` (CSS + preview); nu e selectable/apply pe live.

### Ce există
- Registry: T1 `ready`, T2 `coming_soon`
- CSS `.storefront-template-1` / `.storefront-template-2` (T2 dark tokens)
- Preview owner izolat: `DEMO_VEHICLES` / `DEMO_DEALER`, `/demo-vehicles/*`, leads off, fără DB writes
- Apply: doar template `ready` (T2 refuzat)
- Live storefront: o cale de date publică (Host + RLS + DTO); shell class din `templateId`
- Notă: `/storefront-template-preview` (membership) poate lista inventar **real** — distinct de preview-ul DEMO

### Propunere
- Aceeași sursă de date / RLS / lead / finance; layout layer T1 vs T2
- Fără modificare vizuală T1; fără duplicarea logicii business
- Activare: T2 → `ready` + allowlist Zod; apply owner + audit
- Fallback live: invalid/coming_soon → T1

### Dependențe
- 22/23 îmbunătățesc footer/CMS/SEO pe orice template, dar T2 poate livra fără ele
- Nu depinde de marketing pixels pentru MVP layout

### Nu intră în 24
CMS/SEO/marketing, detalii firmă, email real, cron, redesign T1, bypass tenant.

---

## E. Conflicte roadmap (documentate, nerezolvate automat)

| # README | Titlu README | Realitate |
|---|---|---|
| 20 | `20-reservation-expiry-jobs` | Livrat ca **RLS hardening** (`8ee603e`); cron rezervări **pending** |
| 22 | company details | Doar audit; neimplementată |
| 23 | `23-pages-cms-seo` | Decizie: include și **marketing integrations**; titlul README nu e actualizat încă |
| 24 | Template 2 | Doar audit; T2 încă `coming_soon` |

**Regulă:** nu renumerota fără decizie explicită a utilizatorului. Cronul rezervărilor rămâne follow-up.

---

## F. Ordinea recomandată după acest audit

1. **Aprobare + implementare Etapa 22** (date firmă) — deblocare footer/legal/SEO ulterior  
2. **Aprobare + implementare Etapa 23** (CMS + SEO + marketing pe infrastructură consent)  
3. **Aprobare + implementare Etapa 24** (Template 2 activ, fără regresii T1)  
4. Separat: cron expirare rezervări (conflict #20) — etapă/follow-up la decizie  
5. Handoff-uri pe etapă la finalul fiecărei implementări (`22-…`, `23-…`, `24-…`)

---

## G. Roluri reale (neschimbate)

```text
owner | manager | sales | viewer
```

Nu există `admin`. Setările sensibile (firmă, teme, viitor CMS/SEO/marketing) → **owner-only**.

---

## H. Confirmări

- Auditurile 22/23/24: **read-only** (fără migrări, fără modificări DB/RLS/env în timpul auditului)
- Etapa 21: commit + push efectuate anterior în sesiune; deployment Production `success`
- Acest fișier: creat la cerere ca handoff „Audit 9 Octombrie 2026”
- **Nu** s-a făcut deploy manual / Vercel CLI în sesiunea de audit
- Email invitații rămâne noop/log
- Testarea RLS fără bypass rămâne pattern-ul de referință (Etapele 20–21)

## I. Următorul pas așteptat

Aprobare explicită pentru **implementarea** uneia dintre:
- Etapa 22 — Detalii complete firmă  
- Etapa 23 — CMS + SEO + Marketing  
- Etapa 24 — Template 2  

sau decizie de renumerotare / cron rezervări.
