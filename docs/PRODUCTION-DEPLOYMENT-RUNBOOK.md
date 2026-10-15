# Production Deployment Runbook — Marketing + SEO + Consent + Tracking

**Data:** 2026-10-16 (Europe/Bucharest)
**Scope:** Phases 2–8 (SEO Core → Marketing → Consent → Tracking → Events → Content SEO → Health → Final QA)
**Companion docs:**
- [`PRODUCTION-READINESS-MARKETING.md`](./PRODUCTION-READINESS-MARKETING.md)
- [`QA-MARKETING-SEO.md`](./QA-MARKETING-SEO.md)
- [`handoffs/32-final-qa-production-readiness.md`](./handoffs/32-final-qa-production-readiness.md)
- [`MARKETING-SEO-TRACKING-PLAN.md`](./MARKETING-SEO-TRACKING-PLAN.md)
- [`.env.example`](../.env.example) · [`stages/12-hardening-deploy.md`](./stages/12-hardening-deploy.md)

**Acest document este operațional.** Nu conține secrete. Nu execută deploy. Nu presupune că migrările Production sunt deja aplicate.

---

## 0. Stare curentă (manual confirmation)

| Fact | Valoare / notă |
|------|----------------|
| Branch local la redactare | `master` — vezi SHA release în handoff 32 / `git log -1` după push |
| Deploy SHA | **needs_manual_confirmation** pe Production — folosește SHA-ul commit-ului release Phases 2–8; acest runbook **nu** autorizează `vercel --prod` |
| Local Phase 8 | typecheck / 90 unit / 12 RLS / smoke 6+7 PASS (vezi handoff 32) |
| Production DB migrations 0016–0019 | **needs_manual_confirmation** — nu presupune aplicate |
| DNS / Vercel / env Prod | **needs_manual_confirmation** — nu modifica din acest document |

---

## 1. Preconditions

Înainte de orice acțiune Production:

### 1.1 Backup / recovery

- [ ] Snapshot / backup **Postgres Production** (Supabase: Point-in-Time Recovery sau backup manual) **înainte** de migrări
- [ ] Notează deployment SHA curent pe Vercel (rollback app)
- [ ] Confirmă că știi cum se restaurează DB (PITR window / dump) — **destructive DB rollback nu e automat**
- [ ] Owner aprobă fereastra de mentenanță (dacă e cazul)

### 1.2 Branch & commit

- [ ] Codul de deploy este pe un commit **identificabil** (tag sau SHA) care conține Phases 2–8
- [ ] `git status` pe acel commit: fără `.env`, credențiale, `.vercel`
- [ ] SHA notat aici de operator: `________________`

### 1.3 Build & tests (pe SHA-ul de deploy)

Rulează local sau în CI pe același SHA:

```text
pnpm --filter @auto-platform/web typecheck
pnpm --filter @auto-platform/web exec vitest run src/lib/seo src/lib/cms src/lib/marketing src/lib/consent src/lib/dashboard/__tests__/settings-nav.test.ts src/lib/tenant/__tests__/resolve-tenant-from-host.test.ts
pnpm --filter @auto-platform/db exec vitest run src/__tests__/tenant-pages.isolation.test.ts src/__tests__/tenant-marketing-integrations.isolation.test.ts src/__tests__/public-marketing-integrations.isolation.test.ts
pnpm --filter @auto-platform/web build
```

Smoke (necesită web pe `:3000` + Host tenancy):

```text
pnpm --filter @auto-platform/web exec tsx scripts/_smoke-phase6-cms-seo.mts
pnpm --filter @auto-platform/web exec tsx scripts/_smoke-phase7-seo-health.mts
```

- [ ] typecheck PASS
- [ ] unit + RLS PASS
- [ ] build PASS
- [ ] smoke PASS (sau echivalent pe staging)

### 1.4 Conturi

- [ ] Owner account Production (sau staging mirror) funcțional
- [ ] Tenant A de test (ex. `acme` sau slug real) — storefront + dashboard
- [ ] Tenant B de test (ex. `beta` sau slug real) — izolare Host
- [ ] Cel puțin un membership **non-owner** pe un tenant pentru denial check

---

## 2. Database Production

### 2.1 Migrări Marketing/SEO (ordine exactă)

Aplică **doar** după backup. Folosește `DATABASE_URL_MIGRATIONS` (rol elevated) dacă există; altfel `DATABASE_URL` cu drepturi de migrare — **nu** pe path-ul runtime al app-ului cu BYPASSRLS.

| Ordine | Fișier | Ce introduce (rezumat) |
|--------|--------|------------------------|
| 1 | `0013_tenant_pages_and_seo_settings.sql` | `tenant_pages`, `tenant_seo_settings`, RLS, `app.public_seo_settings` (baseline CMS/SEO) |
| 2 | `0016_seo_core_og_templates.sql` | OG / title template pe SEO settings; recreate `app.public_seo_settings` |
| 3 | `0017_tenant_marketing_integrations.sql` | Tabel marketing IDs; FORCE RLS owner-only; **fără** GRANT anon |
| 4 | `0018_public_marketing_integrations.sql` | `app.public_marketing_integrations` SECURITY DEFINER whitelist |
| 5 | `0019_tenant_pages_seo_landing.sql` | Landing SEO: archived, kinds, h1/intro/canonical/noindex/faq/filters |

> Dacă Production are deja `0013` din Etapa 23A, începe verificarea de la `0016`. **Nu presupune** — verifică journal-ul (§2.2).

Comandă proiect (când owner decide să migreze):

```text
pnpm db:migrate
```

(`packages/db` → `node ./scripts/migrate.mjs`; citește `DATABASE_URL_MIGRATIONS` sau `DATABASE_URL`.)

### 2.2 Verificare status Drizzle (read-only)

În SQL editor Supabase / `psql` pe **Production** (read-only preferabil):

```sql
-- Journal Drizzle (nume tipic; confirmă schema dacă diferă)
SELECT id, hash, created_at
FROM drizzle.__drizzle_migrations
ORDER BY created_at;
-- SAU, în funcție de setup:
-- SELECT * FROM drizzle.migrations ORDER BY id;
```

Caută tag-uri / hashes corespunzătoare fișierelor `0016`…`0019` din `packages/db/drizzle/`.

```sql
-- Tabele / funcții așteptate
SELECT to_regclass('public.tenant_seo_settings') AS seo_settings;
SELECT to_regclass('public.tenant_marketing_integrations') AS marketing;
SELECT to_regclass('public.tenant_pages') AS pages;

SELECT proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'app'
  AND proname IN ('public_seo_settings', 'public_marketing_integrations');
```

### 2.3 Confirmare RLS (read-only)

```sql
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'tenant_pages',
    'tenant_seo_settings',
    'tenant_marketing_integrations'
  );
-- Așteptat: relrowsecurity = true, relforcerowsecurity = true
```

```sql
SELECT polname, polcmd, polroles::regrole[]
FROM pg_policy
WHERE polrelid = 'public.tenant_marketing_integrations'::regclass;
-- Așteptat: politici owner-only; fără politică anon SELECT pe tabel
```

### 2.4 Confirmare SECURITY DEFINER helpers

```sql
SELECT p.proname, p.prosecdef, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'app'
  AND p.proname IN ('public_seo_settings', 'public_marketing_integrations');
-- prosecdef = true
```

Test izolare (cu tenant UUID-uri reale, **fără** a expune date în ticket public):

```sql
-- Înlocuiește UUID-urile; rulează ca rol fără BYPASSRLS dacă e posibil
SELECT count(*) FROM app.public_marketing_integrations('<tenant_a_uuid>'::uuid);
SELECT count(*) FROM app.public_seo_settings('<tenant_b_uuid>'::uuid);
```

### 2.5 Rollback / recovery limitations

| Situație | Acțiune |
|----------|---------|
| App broken, migrări **neaplicate** | Redeploy previous SHA pe Vercel |
| Migrări **aplicate**, app broken | Redeploy previous SHA **și** evaluează compatibilitate schema; dacă app vechi nu suportă schema nouă → restore DB snapshot / PITR **sau** forward-fix |
| Migrări aplicate, date corupte | **Nu** există down-migration automată în acest repo pentru 0016–0019 — restore din backup |
| Doar tracking greșit | Disable IDs în dashboard (owner) — fără rollback DB |

---

## 3. Environment audit

Surse: `.env.example`, `apps/web/src` (`process.env.*`), handoff 12/32.
**Nu inventa valori.** Completează coloana „Prod confirmed” la execuție.

### 3.1 Required for real multi-tenant Production

| Variable | Class | Notes |
|----------|-------|-------|
| `DATABASE_URL` | **required** | Session pooler recomandat; rol **fără** BYPASSRLS pe runtime |
| `NEXT_PUBLIC_SUPABASE_URL` | **required** | Auth / client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **required** | Public; OK în browser |
| `NEXT_PUBLIC_ROOT_DOMAIN` | **required** | Bare root, ex. `autobear.ro` — **nu** `www.autobear.ro` ca root |
| `NEXT_PUBLIC_APP_URL` | **required** | Origin canonic apex, ex. `https://www.autobear.ro` |

### 3.2 Required for media gallery (signed URLs)

| Variable | Class | Notes |
|----------|-------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | **required** (dacă galerie signed) | Server-only; **niciodată** pe path user public / client |
| `NEXT_PUBLIC_MEDIA_BUCKET` | **safe_default** | Default `vehicle-media` |

### 3.3 Strongly recommended

| Variable | Class | Notes |
|----------|-------|-------|
| `LEAD_RATE_LIMIT_SECRET` | **optional / recommended** | Pepper pentru rate-limit IP pe lead-uri publice |
| `DATABASE_URL_MIGRATIONS` | **optional** | Doar job migrare; nu pe app runtime |

### 3.4 Email / leads

| Variable | Class | Notes |
|----------|-------|-------|
| `LEAD_EMAIL_PROVIDER` | **safe_default** | `noop` (default) sau `log`; v1 fără Resend obligatoriu |
| `TRUSTED_PROXY` | **optional** | `1` doar în spatele proxy de încredere (IP client) |

### 3.5 Billing (doar dacă self-serve e ON)

| Variable | Class | Notes |
|----------|-------|-------|
| `COMMERCIAL_SELF_SERVE_CHECKOUT` | **optional** | Fail-closed dacă lipsește / fals |
| `PAYMENT_PROVIDER` | **safe_default** | `noop` default |
| `STRIPE_SECRET_KEY` | **required if Stripe** | Server-only |
| `STRIPE_WEBHOOK_SECRET` | **required if Stripe** | |
| `STRIPE_PRICE_PLAN_50` / `BUSINESS` / `PREMIUM` | **required if Stripe** | |
| `BILLING_NOOP_WEBHOOK_SECRET` | **optional** | Teste noop |

### 3.6 SEO Health live fetch (optional)

| Variable | Class | Notes |
|----------|-------|-------|
| `SEO_HEALTH_FETCH_BASE` | **optional** | Absolute origin dacă self-fetch Host eșuează pe serverless |
| `SMOKE_BASE` | **optional** | Fallback local smoke |

### 3.7 Platform (setate de Vercel — nu le copia manual de obicei)

| Variable | Class | Notes |
|----------|-------|-------|
| `VERCEL` | platform | `"1"` pe Vercel |
| `VERCEL_URL` | platform | |
| `VERCEL_PROJECT_PRODUCTION_URL` | platform | |

### 3.8 Must NOT be present / must be OFF on real multi-tenant Production

| Variable | Class | Notes |
|----------|-------|-------|
| `HOBBY_DEMO_ONLY` | **must not be present** (sau ≠ `true`) | Activează fallback single-tenant pe `*.vercel.app` |
| `HOBBY_DEMO_TENANT_SLUG` | **must not be present** | |
| `HOBBY_DEMO_DISABLE_PUBLIC_LEADS` | **must not be present** (sau irrelevant) | |
| `HOBBY_DEMO_APEX_CATALOG` | **must not be present** | |
| `SEED_PROFILE_A_ID` / `SEED_PROFILE_B_ID` | **must not be present** pe Prod | Doar seed/dev |
| `PERF_SERVER_TIMING` | **must not be present** pe Prod public | Debug |

**Explicit:** pe Production multi-tenant cu `*.autobear.ro`, **toate** variabilele `HOBBY_DEMO_*` trebuie **absente** sau setate astfel încât gate-ul Hobby să nu se activeze. Hobby demo ≠ Production multi-tenant.

### 3.9 Auth / cookies (config Supabase Dashboard — nu env app)

| Item | Class | Manual |
|------|-------|--------|
| Supabase Auth Site URL | required | = `NEXT_PUBLIC_APP_URL` / apex |
| Redirect URLs allowlist | required | Include `{APP_URL}/**`, tenant hosts dacă e cazul |
| Cookie `ab_consent` | code | Host-only, SameSite=Lax, Secure pe HTTPS — fără env dedicat |

### 3.10 Per-tenant (dashboard, nu env)

GTM / GA4 / Ads / pixeli / verification tags — configurate de **owner** în Marketing. Nu apar în Vercel env.

---

## 4. Domain and DNS

**Nu presupune providerul DNS** (Cloudflare / Route53 / registrar / Vercel DNS). Pașii de mai jos sunt **manual confirmation**.

### 4.1 Target model (din `.env.example`)

| Host | Rol |
|------|-----|
| `www.autobear.ro` | Apex marketing / SaaS (`NEXT_PUBLIC_APP_URL`) |
| `autobear.ro` | Bare apex → **308** către `https://www.autobear.ro` |
| `{slug}.autobear.ro` | Storefront tenant (`NEXT_PUBLIC_ROOT_DOMAIN=autobear.ro`) |

Tenants **nu** sunt `{slug}.www.autobear.ro`.

### 4.2 Vercel project (manual)

- [ ] Project Root Directory = monorepo `.`
- [ ] Node.js **20.x**
- [ ] Install: `pnpm install`
- [ ] Build: `pnpm --filter @auto-platform/web build`
- [ ] Env Production setate (§3)
- [ ] Domain(s) adăugate în Project → Domains

### 4.3 Wildcard options (alege una — manual)

**Opțiunea A — Nameservers către Vercel**
- [ ] La registrar: NS → Vercel
- [ ] În Vercel: adaugă `autobear.ro`, `www`, și `*.autobear.ro`
- [ ] Așteaptă propagare NS

**Opțiunea B — DNS extern (CNAME / ALIAS)**
- [ ] `www` → CNAME/ALIAS către target-ul Vercel (conform UI Domains)
- [ ] Apex bare: ALIAS/ANAME sau redirect provider
- [ ] Wildcard `*.autobear.ro` → CNAME către același target Vercel (**dacă** planul Vercel + DNS provider suportă wildcard pe custom domain)
- [ ] Dacă wildcard pe custom domain **nu** e disponibil pe planul curent → **GO blocker** până se rezolvă (Vercel Pro / DNS compatible)

> Wildcard pe custom domains poate necesita plan plătit Vercel — **confirmă manual** înainte de go-live multi-tenant.

### 4.4 Certificates & HTTPS

- [ ] Certificat valid pe `www`
- [ ] Certificat valid pe un tenant de test `{slug}.autobear.ro`
- [ ] HTTP → HTTPS redirect
- [ ] Consent cookie pe HTTPS include `Secure`

### 4.5 Tenant subdomain smoke (după DNS)

```text
https://{tenantA}.autobear.ro/
https://{tenantB}.autobear.ro/
https://www.autobear.ro/
```

- [ ] A ≠ B (brand / catalog)
- [ ] Apex nu servește catalogul tenant greșit

---

## 5. Deployment order

Ordine recomandată (execută doar după aprobare owner):

1. **Backup** DB Production (§1.1)
2. **Verify env** pe Vercel Production (§3) — inclusiv absența `HOBBY_DEMO_*`
3. **Apply migrations** `0016`→`0019` (și `0013` dacă lipsește) via `pnpm db:migrate` cu URL de migrare
4. **Verify migrations** (§2.2–2.4) read-only
5. **Deploy Production** (Vercel: promote SHA / merge + auto-deploy — după ce SHA include Phases 2–8)
6. **Verify domains** + HTTPS (§4)
7. **Smoke tenant A/B** (§6)
8. **Verify public SEO** (robots, sitemap, canonical, JSON-LD)
9. **Verify consent / tracking** (reject → accept; Network)
10. **Monitor** Vercel logs / Supabase logs 30–60 min

Dacă migrările eșuează: **nu** continua cu deploy feature; restaurează / repară DB, apoi reîncearcă.

---

## 6. Post-deploy smoke matrix

Bifează pe Production (sau staging identic). Host = `{slug}.autobear.ro`.

| # | Check | A | B |
|---|-------|---|---|
| S1 | Homepage 200 + brand | [ ] | [ ] |
| S2 | Catalog + filtre | [ ] | [ ] |
| S3 | Vehicle detail | [ ] | [ ] |
| S4 | CMS / landing `/p/…` published | [ ] | [ ] |
| S5 | `/robots.txt` 200 | [ ] | [ ] |
| S6 | `/sitemap.xml` 200, fără `/compara` `/salvate` `/dashboard` în `<loc>` | [ ] | [ ] |
| S7 | Canonical absolut pe Host (view-source) | [ ] | [ ] |
| S8 | OG tags / fallback | [ ] | [ ] |
| S9 | JSON-LD prezent (Org/WebSite sau Product) | [ ] | [ ] |
| S10 | `/compara` + noindex | [ ] | [ ] |
| S11 | `/salvate` + noindex | [ ] | [ ] |
| S12 | Consent: first visit fără GTM; reject; accept | [ ] | [ ] |
| S13 | GTM/GA4 gating după consent (dacă IDs configurate) | [ ] | [ ] |
| S14 | Lead form (sau noop acceptabil) | [ ] | [ ] |
| S15 | Owner: Marketing + SEO Health | [ ] | [ ] |
| S16 | Non-owner: `/dashboard/settings/marketing` → 404 | [ ] | [ ] |
| S17 | SEO Health rulează fără cross-tenant | [ ] | [ ] |
| S18 | A/B isolation (HTML/sitemap diferit) | [ ] | [ ] |

---

## 7. Google validation (post-deploy public)

Nu poate fi înlocuit complet de smoke local. Surse: [URL Inspection](https://support.google.com/webmasters/answer/9012289), [Sitemaps](https://support.google.com/webmasters/answer/183668), [CWV](https://support.google.com/webmasters/answer/9205520).

### 7.1 Search Console

- [ ] Property **Domain** `autobear.ro` **sau** URL-prefix per tenant Host (decizie owner)
- [ ] Verification: meta tag din dashboard Marketing → Verification (sau DNS TXT)
- [ ] Submit sitemap: `https://{slug}.autobear.ro/sitemap.xml` (per property relevantă)
- [ ] Monitor Sitemaps report (Success ≠ toate URL-urile indexate)

### 7.2 URL Inspection (per tip de pagină)

| URL | Indexed view | Test live URL |
|-----|--------------|---------------|
| Homepage `/` | [ ] | [ ] |
| Catalog (clean) | [ ] | [ ] |
| Representative vehicle | [ ] | [ ] |
| CMS / landing `/p/…` | [ ] | [ ] |

Verifică: indexability, canonical, structured data / Enhancements, sitemap discovery.

**Imediat vs după crawl:** live test arată starea curentă; indexul se actualizează după crawl / request indexing (cotă zilnică). Pentru bulk, preferă sitemap updated față de request pe fiecare URL.

### 7.3 Rich Results / structured data

- [ ] Homepage: Organization / WebSite
- [ ] Vehicle: Product + Offer (fără VIN)
- [ ] Landing: FAQPage / ItemList **doar** dacă conținutul e vizibil
- [ ] Distinge **errors** vs **warnings**

### 7.4 Core Web Vitals (baseline)

Ținte Good (field/CrUX): LCP ≤ 2.5s · INP ≤ 200ms · CLS ≤ 0.1.
Datele pot lipsi 28 zile până există trafic suficient — notează baseline lab (Lighthouse) separat, fără a-l confunda cu field.

### 7.5 GTM Preview (dacă GTM e folosit)

- [ ] Consent default denied
- [ ] Update după Accept
- [ ] Tags fire doar post-consent
- [ ] Fără dubluri GTM + GA4 direct

---

## 8. Rollback

### 8.1 Application

1. Vercel → Deployments → Promote / Redeploy **previous known-good SHA**
2. Verifică homepage A/B + `/robots.txt`
3. Anunță owner

### 8.2 Dacă migrarea a rulat deja

- App rollback singur poate fi OK dacă schema e backward-compatible
- Dacă app vechi **nu** cunoaște coloane/tabele noi:
  - **preferat:** forward-fix pe app
  - **ultimă soluție:** restore DB la snapshot pre-migrare + app vechi
- **Nu** există script „down” automat pentru 0016–0019 în repo

### 8.3 Disable tracking (fără rollback)

Owner → Marketing → Analytics: golește / disable GTM, GA4, pixeli → Salvează.

### 8.4 Disable indexing safely

Owner → Preferințe SEO: `indexingEnabled = false` → robots/metadata noindex pe tenant.
**Nu** eechivalent cu ștergerea din index Google (necesită GSC / timp).

### 8.5 Emergency

- Decizie: **owner produs** (go / no-go / rollback)
- Contact tehnic: operatorul care deține acces Vercel + Supabase (completează manual): `________________`

---

## 9. Production go/no-go checklist

**GO** doar dacă toate sunt bifate (sau explicit waived de owner în scris).

### Blockers

- [ ] Migrări 0016–0019 (și 0013 dacă e cazul) **confirmate pe Production DB**
- [ ] Env Production confirmat (§3.1–3.2)
- [ ] `HOBBY_DEMO_*` **absente / OFF** pe Production multi-tenant
- [ ] DNS: apex + **wildcard** `*.{ROOT}` confirmat (sau waiver scris)
- [ ] HTTPS valid pe apex + tenant test
- [ ] Deploy SHA conține Phases 2–8 (commit făcut separat, când owner cere)
- [ ] Build PASS pe acel SHA
- [ ] Tests + smoke PASS pe acel SHA
- [ ] Owner access Marketing / SEO Health PASS
- [ ] Tenant A/B isolation PASS
- [ ] SEO endpoints (`robots`, `sitemap`) PASS
- [ ] Consent gating PASS
- [ ] Rollback plan **înțeles** (app + DB limitations)

### Non-blocking post-launch (nu blochează GO dacă documentate)

- [ ] CSP headers — **post-launch hardening** (§10)
- [ ] GSC property + sitemap submitted
- [ ] CWV field baseline
- [ ] `LEAD_RATE_LIMIT_SECRET` setat

**Semnătură owner:** _______________ **Data:** _______________
**GO / NO-GO:** _______________

---

## 10. CSP — post-launch hardening (nu quick-fix)

CSP **nu** e în v1. Nu adăuga CSP nesigur (`unsafe-inline` peste tot) fără review.

Conform [Next.js CSP docs](https://nextjs.org/docs/app/guides/content-security-policy):

- Nonce-based CSP necesită **dynamic rendering** per request
- Nonce e incompatibil cu static optimization / ISR / PPR în forma documentată
- Trebuie testat pe app-ul real (storefront + dashboard + Auth)

Dacă se implementează ulterior, ține cont de:

| Surface | Cerință tipică |
|---------|----------------|
| Next.js / framework scripts | nonce sau hash |
| GTM | `https://www.googletagmanager.com` (+ eventual inline boot) |
| GA4 / gtag | `https://www.google-analytics.com` / googletagmanager |
| Meta | `https://connect.facebook.net` |
| TikTok | `https://analytics.tiktok.com` |
| LinkedIn | `https://snap.licdn.com` |
| Fonts / images | self + storage CDN Supabase |
| Supabase Auth | `NEXT_PUBLIC_SUPABASE_URL` host |
| Storage signed URLs | bucket host |
| WebSockets | doar dacă apar în app (Realtime) — confirmă înainte |

**Procedură viitoare:** staging → CSP Report-Only → fix violations → enforce. Nu pe Production fără trecere verde pe staging.

---

## 11. Operational decisions (locked)

1. Host = sursa tenantului; niciodată `tenant_id` din client.
2. Marketing / CMS / SEO Health = **owner-only**.
3. Custom scripts = **NU în v1**.
4. GTM-first: fără GA4/pixeli direct când GTM e activ.
5. Consent înainte de tracking.
6. `/compara` + `/salvate` = noindex forțat.
7. Hobby demo ≠ Production multi-tenant.
8. CSP = post-launch, nu blocker GO dacă restul e verde.
9. Acest runbook **nu** autorizează commit / push / deploy / migrare — owner decide explicit.

---

## 12. Unknowns requiring manual confirmation

| # | Unknown |
|---|---------|
| U1 | SHA exact de Production (Phases 2–8 încă uncommitted la redactare) |
| U2 | Status migrări 0016–0019 pe DB Production |
| U3 | Valorile reale env pe Vercel Production |
| U4 | Provider DNS + dacă wildcard custom domain e suportat pe planul Vercel actual |
| U5 | Slug-urile tenant A/B de smoke pe Prod |
| U6 | Dacă self-serve Stripe e ON (billing env) |
| U7 | Dacă GSC e Domain property sau per-tenant URL-prefix |
| U8 | Fereastra PITR / politică backup Supabase |

---

## 13. Exact go/no-go blockers (summary)

Un singur **NO-GO** dacă oricare e adevărat:

1. Migrările Marketing/SEO **nu** sunt confirmate pe Production
2. `HOBBY_DEMO_ONLY=true` (sau echivalent activ) pe Production multi-tenant
3. Wildcard `*.{ROOT}` **sau** HTTPS tenant **nefuncțional**
4. Env core (`DATABASE_URL`, Supabase, `ROOT_DOMAIN`, `APP_URL`) incomplet / greșit
5. Build/tests pe SHA-ul de deploy **eșuate**
6. Owner **nu** a aprobat explicit deploy-ul
7. Rollback DB **neînțeles** (fără backup înainte de migrare)

Când toate blockers sunt rezolvate → folosește §9 pentru semnătura **GO**.
