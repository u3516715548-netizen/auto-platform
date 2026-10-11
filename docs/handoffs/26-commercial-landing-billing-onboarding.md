# Handoff — Etapa 26: Landing comercială + billing + onboarding (plan)

## Meta
- Data: 11 octombrie 2026
- Workspace: `C:\Users\Wolf\dev\aplicatie-masini`
- Branch: `master`
- Ultimul commit (context): `af7cb8d` — *fix(catalog): keep filter CTA clear of the mobile tab bar*
- Status: **26A livrată local** (landing + prețuri + apex demo off); 26B/26C neîncepute; **fără** commit / push / deploy până la cerere
- Tip document: plan + livrare 26A (secțiune mai jos)
- Documente citite:
  - `docs/handoffs/README.md`
  - `docs/handoffs/24-template-2.md`
  - `docs/handoffs/23a2-production-performance-cache-middleware-ssr.md`
  - `docs/handoffs/audit-9-octombrie-2026.md`
  - `docs/auth-tenancy.md` (Host → tenant)
  - `HANDOFF_Functionalitati.md` / `HANDOFF_Status_Actual_Aplicatie_Auto_Platform.md` (Billing MISSING; apex landing stub)
  - starea la plan: `tenant_plan` = `starter` | `premium`; apex era stub; fără Stripe/Netopia (26A a înlocuit stub-ul cu landing comercială)

## Obiectiv

Livra fluxul comercial SaaS pe **apex** (platformă, nu storefront dealer):

```text
Landing publică → autentificare/înregistrare → alegere plan
→ pending checkout → plată (provider) → webhook verificat
→ tenant/dealer activ + entitlements → onboarding branding/template
→ primul vehicul → storefront pe hostul dealerului
```

Monedă afișată: **RON**. Prețuri **lunare**. TVA / facturare: decizii de business (în afara implementării MVP până la clarificare).

## Scope aprobat (etapă întreagă 26)

### IN
- Landing comercială pe apex (SaaS)
- Pagină de prețuri + afișarea celor 4 pachete
- Mutarea demo Hobby/ACME **de pe** apex-ul default
- Auth **înainte** de checkout
- Alegere plan plătibil → stare `pending checkout`
- Adapter abstract de plăți (UI + entitlements **fără** cuplare la un vendor)
- Webhook idempotent → activare tenant + subscription/entitlements
- Onboarding ghidat: branding/template → primul vehicul
- Gating / limită `available` după entitlement (nu hardcode în UI)
- Invalidare cache storefront (pattern 23A.2) la mutații relevante

### OUT
- Implementare Stripe / Netopia / webhook-uri / chei în această fază de **plan**
- Self-checkout Enterprise
- Custom domains automate
- Marketplace, VIN, Expo, Template layout nou
- Upgrade / downgrade automat de plan
- Modificare inventar demo ACME (vehicule, media, statusuri)
- Storefront ACME ca landing comercială
- Commit / push / deploy / Vercel CLI fără cerere ulterioară

## Pachete comerciale confirmate (date de produs)

| Pachet (cod intern propus) | Mașini publicate (`available`) | Preț afișat | Self-checkout MVP |
|----------------------------|-------------------------------:|-------------|-------------------|
| `plan_50` | 50 | 149 lei/lună | Da |
| `business` | 150 | 299 lei/lună | Da |
| `premium` | 500 | 599 lei/lună | Da |
| `enterprise` | Nelimitat (utilizare rezonabilă) | Preț negociat | **Nu** — CTA „Contactează-ne” |

Note:
- Limitele se modelează prin **entitlements / plan limits**, nu prin constante risipite în componente.
- Enum-ul actual DB `tenant_plan` (`starter` | `premium`) **nu** acoperă aceste pachete — migrare necesară în 26B (nu în 26A UI-only).
- `premium` comercial (500 mașini) ≠ sensul actual al enum-ului `premium` din seed — rename/mapare explicită la migrare.

## Flow confirmat (auth înainte de plată)

1. Vizitare apex → landing comercială (+ link prețuri).
2. **Autentificare / înregistrare** (cont utilizator).
3. Alegere plan plătibil (`plan_50` | `business` | `premium`).
4. Creare sesiune internă **pending checkout** (tenant draft sau intent legat de user — vezi model date).
5. Redirect la provider (Checkout) via **PaymentAdapter**.
6. Webhook **semnat + idempotent** → confirmare plată.
7. Activare: tenant `active` (sau echivalent), membership `owner`, entitlements aplicate.
8. Onboarding: branding / template → primul vehicul.
9. Storefront pe host tenant (`{slug}.{root}`), nu pe apex.

Enterprise: formular / canal „Contactează-ne” → lead comercial; **fără** plan plătibil și **fără** checkout.

## Stare înainte (inventar tehnic)

| Zonă | Stare |
|------|--------|
| Apex `/` | Stub `ApexLanding` (titlu + link login) |
| Hobby pe apex | `HOBBY_DEMO_*` poate încărca catalog pe apex Host |
| Billing | MISSING |
| Self-serve tenant | MISSING (seed / invite team only) |
| `tenants.plan` | `starter` \| `premium` — nealiniat la pachetele comerciale |
| Limită inventar pe plan | Inexistentă |
| Public DTO | Corect: **fără** `plan` / id intern |
| Cache public | TTL 30s + `revalidatePublicStorefrontPaths` (23A.2) |

## Analiză și decizii (plan)

### 1. Numerotare
- Etapa **26**, slug `26-commercial-landing-billing-onboarding`.
- Fără renumerotare 14–25.
- Sub-pași: **26A / 26B / 26C** (vezi mai jos).

### 2. Provider de plată = adapter abstract
Providerul final **nu este decis**.

| Opțiune | Rol în plan |
|---------|-------------|
| **Stripe Checkout + Billing** | Recomandare **MVP** (subscripții, webhook-uri mature, Checkout hosted) |
| **Netopia Payments** | Alternativă locală RO — același `PaymentAdapter` |

Contract conceptual (nume ilustrative — fără implementare acum):

```text
PaymentAdapter
  createCheckoutSession({ tenantId, planCode, userId, successUrl, cancelUrl })
  parseAndVerifyWebhook(request) → { eventId, type, externalSubscriptionId, … }
  mapExternalStatus → internal subscription status
```

Reguli:
- UI de prețuri / onboarding / entitlements **nu** importă SDK Stripe/Netopia.
- Coloanele de business stochează `provider` + `external_*` ids, nu tipuri Stripe.
- Schimbarea providerului = implementare nouă de adapter + config env (nume variabile, niciodată valori în git/handoff).

### 3. Hobby demo pe apex — variantă recomandată (sigură)

**Țintă:** landing comercială = default pe apex.

**Propunere (fail-closed, fără a strica linkurile tenant existente):**

1. Apex Host (`localhost:3000`, apex Hobby `*.vercel.app` fără slug) → **întotdeauna** landing comercială (26A).
2. Catalogul demo ACME rămâne pe **subdomeniul tenant** deja folosit: `acme.{ROOT_DOMAIN}` / `acme.localhost:3000` — aceste URL-uri **nu se rup**.
3. `HOBBY_DEMO_ONLY` pe apex: **dezactivat by default** pentru catalog; opțional flag explicit de urgență (ex. env `HOBBY_DEMO_APEX_CATALOG=1`, fail-closed `0`/absent) doar dacă e nevoie temporară de catalog pe apex — documentat, nu default.
4. **Nu** se modifică inventarul demo ACME (vehicule, media, statusuri).
5. Bookmark-uri / demo public actual pe apex care arătau catalogul ACME vor vedea landing-ul; documentația demo trebuie să pointeze la `acme.…` (comunicare, nu rewrite agresiv fără aprobare).

Aceasta e varianta cea mai sigură: nu atinge Host-resolution pentru slug-uri existente; nu cere inventar nou; izolează SaaS landing de storefront dealer.

### 4. Cache / storefront (23A.2)
- Activarea tenantului și mutațiile de branding / status vehicul **trebuie** să apeleze `revalidatePublicStorefrontPaths` (și tag tenant).
- Landing apex: separat de Data Cache inventar; nu amesteca DTO dealer în HTML apex.
- Riscul: webhook activează tenant dar storefront rămâne stale ≤30s dacă invalidarea e omisă — obligatoriu în 26B/26C checklist.

## Arhitectură recomandată

```text
[Apex Host]
  /                 → landing comercială (26A)
  /preturi          → 4 pachete (26A)
  /login|/signup    → auth (existent + extinderi minime 26B)
  /onboarding/**    → post-plată (26C) — doar owner pe tenant propriu

[PaymentAdapter] ← Stripe MVP recomandat | Netopia alternativă
       ↑ webhook route (server-only, signature verify, idempotent)

[DB]
  catalog planuri + entitlements (limits)
  checkout_sessions / subscriptions (provider-agnostic)
  tenants + memberships (activare după webhook)

[Tenant Host] {slug}.root
  storefront public (neschimbat ca produs) + gating publish după limită
```

Principii de securitate (neschimbate):
1. Tenant din **Host** (sau din sesiune server după provisioning — niciodată `tenant_id` din client ca sursă de adevăr pe storefront).
2. Fără `service_role` pe path-uri user.
3. Webhook: secret provider, verificare semnătură, **idempotency key** pe `event_id`.
4. Public DTO fără `plan`, id intern, secrete billing.
5. FORCE RLS pe tabele noi de billing/entitlements.

## Model de date propus (26B — fără migrare acum)

Propunere conceptuală (nume finale la implementare):

| Entitate | Rol |
|----------|-----|
| `commercial_plans` (sau config versionat server) | Cod plan, label RO, `max_published_vehicles` (null = unlimited pentru enterprise intern, dar fără checkout), preț afișat RON, `self_serve` bool |
| `tenant_entitlements` 1:1 tenant | `plan_code`, `max_published_vehicles`, `source` (checkout\|manual\|legacy), `valid_until` opțional |
| `billing_checkout_sessions` | user/tenant intent, plan_code, status (`pending`\|`completed`\|`expired`\|`failed`), provider, external_session_id, idempotency |
| `billing_subscriptions` | tenant_id, provider, external_subscription_id, status, current_period_* |
| `billing_webhook_events` | provider, event_id **UNIQUE**, payload hash/meta non-secret, processed_at |

`tenants`:
- Extindere / migrare `tenant_plan` **sau** (preferabil) deprecare treptată în favoarea `tenant_entitlements.plan_code` + păstrare coloană legacy mapată.
- Status: `trial` / `active` / `suspended` rămân; pending checkout **nu** expune storefront public până la activare.

Limite:
- Enforce la **tranziție status → `available`** (și la create dacă e cazul): count `available` < entitlement.
- Enterprise: entitlement manual / sales-ops, nu din Checkout.

## RLS / securitate webhook (cerințe 26B)

| Control | Cerință |
|---------|---------|
| RLS | ENABLE + FORCE pe tabele billing/entitlements; policies pe `tenant_id` + membership |
| Anon | Fără SELECT pe subscriptions / checkout / webhook events |
| Owner/staff | Citește entitlement propriu; nu mută `max_published_vehicles` din client |
| Webhook route | Fără cookie session; verificare semnătură provider; reject pe eșec |
| Idempotency | Insert `billing_webhook_events(event_id)` unique → skip reprocess |
| Secrets | Doar env server (`*_WEBHOOK_SECRET`, `*_SECRET_KEY`); niciodată `NEXT_PUBLIC_*` pentru secrete |
| Audit | Evenimente `billing.checkout.completed`, `tenant.activated` fără PII/card data în metadata |

## Riscuri și limitări

| Risc | Mitigare în plan |
|------|------------------|
| Cuplare UI la Stripe | Adapter + entitlements interne |
| Enum `premium` ambiguu | Migrare/mapare explicită; coduri noi `plan_50` / `business` / `premium` / `enterprise` |
| Apex Hobby rupe demo | Demo pe `acme.{root}`; flag apex opt-in fail-closed |
| Double webhook | Tabel events + unique event_id |
| Tenant activ fără invalidare cache | Checklist `revalidatePublicStorefrontPaths` |
| TVA / e-Factura | Decizie business; MVP afișează preț lunar RON „orientativ” până la clarificare |
| Race publish peste limită | Enforce server-side în status transition + test concurență |

## Plan pe sub-etape

### 26A — Landing + prețuri + apex fără catalog demo
**IN:** landing comercială apex; `/preturi` (sau secțiune) cu 4 pachete; CTA self-serve pentru 3 planuri; Enterprise „Contactează-ne”; mutare demo de pe apex (subdomeniu + flag); teste UI/host resolution.  
**OUT:** Stripe/Netopia, webhook, entitlements DB, onboarding ghidat, limite publish.  
**Verificări:** apex = landing; `acme.{root}` catalog neschimbat ca inventar; fără leak plan în DTO public.

### 26B — Auth → checkout pending → adapter → webhook → activare
**IN:** flux account-first; pending checkout; `PaymentAdapter` + stub sau un provider după decizie; webhook idempotent; subscriptions + entitlements; activare tenant + owner membership.  
**OUT:** onboarding UI complet; upgrade/downgrade; Enterprise checkout.  
**Verificări:** teste semnătură webhook fail/success; idempotency; izolare tenant; fără `service_role` pe path user.

### 26C — Onboarding + prim vehicul + gating limite + cache
**IN:** wizard branding/template (reuse apply T1/T2 existent); primul vehicul; gate `available` pe entitlement; invalidare cache.  
**OUT:** custom domain; template layout nou; billing portal complet.  
**Verificări:** publish blocat la plafon; publish OK sub plafon; revalidate; smoke host tenant.

## Teste obligatorii (la implementare, pe sub-pas)

| Zonă | Ce acoperă |
|------|------------|
| Host | Apex → landing; slug tenant → storefront; Hobby apex catalog off by default |
| Plans UI | 4 carduri; prețuri RON; Enterprise fără checkout |
| Auth order | Checkout imposibil fără sesiune |
| Adapter | Contract unit (mock provider) |
| Webhook | Signature invalid → 4xx; replay event_id → no double activate |
| Entitlements | Limită 50/150/500 enforce server-side |
| RLS | Cross-tenant deny pe billing tables |
| Cache | Mutate activate/branding/vehicle → paths/tag revalidate |
| Regresie | Catalog ACME pe `acme.*`; DTO public fără `plan`; 23A.2 TTL neschimbat ca SLA |

## Environment variables (nume — fără valori)

Propuse pentru 26B+ (nu se adaugă acum):
- `PAYMENT_PROVIDER` = `stripe` \| `netopia` \| `noop`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` (dacă Stripe)
- `NETOPIA_*` (dacă Netopia)
- `HOBBY_DEMO_APEX_CATALOG` (optional, default off)
- Existente neschimbate ca contract: `NEXT_PUBLIC_ROOT_DOMAIN`, Supabase URL/anon (fără service_role pe user paths)

## Ce nu a fost implementat

- **26B / 26C** — checkout, adapter plăți, webhook, entitlements DB, onboarding ghidat, gating publish
- Migrări DB / RLS billing
- Stripe / Netopia / chei env de plată
- Commit / push / deploy (până la cerere)

## Decizii rămase (blocker pentru 26B implementare)

1. **Provider MVP efectiv:** Stripe vs Netopia (adapter-ul e pregătit oricum).
2. **TVA:** prețurile afișate includ TVA / +TVA / „orientativ” legal copy.
3. **Facturare:** cine emite factura (Stripe Tax / Netopia / extern).
4. **Slug tenant:** generare la signup vs la checkout success; reguli rezervate (`www`, `acme` demo, etc.).
5. **Trial:** există perioadă trial fără card, sau doar plată → active?
6. **Contact Enterprise:** email/form/lead tip nou vs mailto.
7. **Migrare dealeri existenți** (ACME/Beta seed): mapare la entitlement manual „grandfather”.
8. **URL canonic prețuri:** decis în 26A → `/preturi` (+ secțiune pe landing).

## Livrare 26A (11 octombrie 2026)

### Scope livrat
- Landing comercială apex (`SaasLanding`) — brand-first, fără catalog dealer
- `/preturi` — 4 pachete din `commercial-plans.ts` (RON lunar); Enterprise „Contactează-ne” (mailto)
- CTA self-serve → `/login?plan=…` (auth-first; checkout = 26B)
- Apex Hobby catalog **off by default**; opt-in `HOBBY_DEMO_APEX_CATALOG=1|true`
- Demo storefront neschimbat pe `acme.{root}`; inventar ACME neatins
- `/preturi` pe host tenant → `404`

### Fișiere
| Acțiune | Path |
|---------|------|
| create | `apps/web/src/lib/marketing/commercial-plans.ts` |
| create | `apps/web/src/components/marketing/saas-shell.tsx` |
| create | `apps/web/src/components/marketing/saas-landing.tsx` |
| create | `apps/web/src/components/marketing/pricing-grid.tsx` |
| create | `apps/web/src/app/preturi/page.tsx` |
| create | `apps/web/src/lib/marketing/__tests__/commercial-plans.test.ts` |
| create | `apps/web/src/lib/marketing/__tests__/saas-apex-routes.test.ts` |
| create | `apps/web/scripts/_smoke-26a.mjs` |
| modify | `apps/web/src/app/page.tsx`, `globals.css` |
| modify | `apps/web/src/lib/tenant/vercel-demo-only.ts` (+ teste) |
| modify | `resolve-public-tenant.ts`, `get-current-tenant.ts` (comentarii gate) |

### Rute verificate (smoke)
| Host | Path | Rezultat |
|------|------|----------|
| apex `localhost:3000` | `/` | 200 landing SaaS + 4 planuri |
| apex | `/preturi` | 200 prețuri |
| `acme.localhost:3000` | `/` | 200 catalog dealer (fără saas-marketing) |
| `acme.localhost:3000` | `/preturi` | 404 |
| `acme.localhost:3000` | `/vehicles/golf-8-acme` | 404 |
| `beta.localhost:3000` | `/` | 200 catalog Beta, fără inventar ACME |

### Verificări obligatorii
```text
pnpm db:test                         → 90 passed
pnpm typecheck                       → OK
pnpm --filter @auto-platform/web test → 342 passed
pnpm --filter @auto-platform/web build → OK (`/preturi` în route list)
node apps/web/scripts/_smoke-26a.mjs → 6/6 OK
```
- Unit 26A: `vercel-demo-only` (incl. fail-closed apex catalog), `commercial-plans`, `saas-apex-routes`, `resolve-tenant-from-host`
- Regresie: `public-storefront` ACME/Beta izolate
- Env nou (nume): `HOBBY_DEMO_APEX_CATALOG` — default absent = off

### Limite rămase după 26A
- Fără Stripe/Netopia/webhook/entitlements DB / onboarding
- Contact Enterprise = mailto provizoriu (`contact@autofy.ro`)
- Pe Hobby `*.vercel.app` fără subdomeniu, catalog apex doar cu flag explicit
- Self-serve CTA → login; checkout = 26B

### OUT (respectat)
- Fără Stripe/Netopia/webhook/DB migrare entitlements
- Fără modificare inventar ACME
- Fără commit/push/deploy în această livrare

## Următorul pas recomandat

1. Commit/push **26A** la cerere explicită.
2. Decizie provider (Stripe vs Netopia) → start **26B**.
3. **26C** după webhook + entitlements stabile.

## Reguli pentru agentul următor

- Citește acest handoff + `docs/handoffs/README.md` + 23A.2 (cache) înainte de cod.
- Implementează **doar** sub-pasul cerut (26A / 26B / 26C).
- Nu hardcoda limitele de mașini în React — citește entitlements.
- Nu expune `plan` / billing în DTO public storefront.
- Nu folosi `tenant_id` din query/body ca sursă de adevăr pe storefront.
- Nu pune secrete în `NEXT_PUBLIC_*`.
- Nu modifica inventarul ACME demo.
- Nu implementa Enterprise checkout.
- Nu face commit / push / deploy fără cerere explicită.
- La finalul fiecărui sub-pas: handoff de livrare (addendum în acest fișier **doar dacă** userul cere — preferabil secțiuni `## Livrare 26A` etc. sau fișiere separate `26a-…` dacă se decide ulterior).

## Securitate multi-tenant

- Host-only pentru storefront public.
- Provisioning post-webhook pe server, cu membership owner legat de `auth.users` / `profiles`.
- Billing tables: FORCE RLS, zero anon.
- Webhook izolat, idempotent, fără session fixation.
- Entitlements authoritative pe server la publish.

---

*Plan: 11 octombrie 2026. Livrare 26A locală (suite + smoke verzi), necomisă — același zi. 26B/26C: 0%.*
