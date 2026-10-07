# Status Actual — Aplicație Auto Platform

**Document de handoff complet** pentru analiză pe subpuncte, etape și recomandări.  
**Data:** 7 octombrie 2026  
**Workspace:** `C:\Users\Wolf\dev\aplicatie-masini`  
**Repo GitHub:** https://github.com/u3516715548-netizen/auto-platform  
**Demo live:** https://auto-platform-beige.vercel.app  
**Branch:** `master`  
**Ultimul commit pe remote:** `a258e56` — *Fix Template 1 filters overlay, compare bar and detail layout*  
**Lucru local necommitat (la data acestui document):** polish filtre mobile (animații, X+backdrop, accordion Combustibil/Cutie/Caroserie, z-index nav) — **nu este încă pe Vercel**.

---

## Cum să citești acest document

1. Citește **§0 Verdict** (1 pagină) pentru starea de ansamblu.  
2. Parcurge **§1–§3** (produs, stack, monorepo) înainte de detalii.  
3. Pentru storefront: **§5** (ce există) + **§6** (ce s-a lucrat recent UX).  
4. Pentru dashboard / date / securitate: **§7–§10**.  
5. Pentru „ce urmează”: **§12–§14**.  
6. Folosește **§15 Checklist de verificare** când vrei să testezi manual.  
7. Documentele vechi rămân surse de etapă; **acest fișier este statusul actual consolidat**. Handoff-ul scurt `HANDOFF_ARHITECTURA.md` este **învechit** la hash Git (`5f86187` → real `a258e56` + uncommitted).

---

## Cuprins

| # | Secțiune |
|---|----------|
| 0 | Verdict executiv |
| 1 | Ce este produsul |
| 2 | Stack & principii |
| 3 | Structura monorepo |
| 4 | Roadmap etape 0–13 (status real) |
| 5 | Storefront public (Template 1) — inventar funcțional |
| 6 | Istoric UX Template 1 (sesiuni recente) — ce s-a întâmplat |
| 7 | Dashboard dealer |
| 8 | Multi-tenancy, auth, securitate |
| 9 | Date, RLS, media, seed |
| 10 | Demo vs live (ACME) |
| 11 | Deploy, env, calitate |
| 12 | Gaps cunoscute & datorii tehnice |
| 13 | Ce va mai fi (recomandări prioritizate) |
| 14 | Cum trebuie să funcționeze (contracte / reguli) |
| 15 | Checklist verificare manuală |
| 16 | Hărți de fișiere cheie |
| 17 | Glosar |

---

## 0. Verdict executiv

### Stare generală

Platforma este un **MVP multi-tenant funcțional** pentru dealeri auto:

- Storefront public pe **Template 1** (Autovit-like, rafinat mobil+desktop).  
- Dashboard: inventar, lead-uri, rezervări, setări + Personalizare (teme).  
- Izolare pe **Host** + **RLS** + assert-uri server.  
- Demo pe **Vercel Hobby** (un singur tenant via `HOBBY_DEMO_*`).  

Etapele **1–11** sunt finalizate local. Etapa **12** este „Hobby demo live”, dar documentul de etapă încă spune „fără deploy” — **outdated**. Etapa **13** (template-uri extra) **nu a început**.

### Ce e „gata de arătat”

- Catalog ACME cu filtre, quick sheets, drawer „Toate filtrele”.  
- Detaliu vehicul: finanțare (estimare locală), tehnic+dotări, descriere, alternative, share.  
- Compară (2–4) + Salvate (localStorage).  
- Preview temă izolat de datele reale (demo vehicles).  
- Deploy public: `auto-platform-beige.vercel.app`.

### Ce NU e gata / trebuie știut

| Gap | Impact |
|-----|--------|
| Email lead real | Doar noop/log |
| Cron expirare rezervări | Doar lazy expiry |
| Rate-limit lead multi-instance | In-memory |
| Team invite / CMS pagini / SEO settings | UI placeholder |
| Template 2 | `coming_soon` |
| Formular „Aplică acum” finanțare | Nu persistă în DB |
| Mobile Expo | Placeholder |
| Lucru UX necommitat (7 oct seară) | Doar pe mașina locală |

### Recomandare imediată

1. **Commit + push** polish-ul local de filtre (dacă vrei parity local ↔ Vercel).  
2. Actualizează `HANDOFF_ARHITECTURA.md` + `docs/stages/12-*.md` (status deploy).  
3. Decide următorul focus: **hardening producție** vs **Template 2** vs **conținut catalog**.

---

## 1. Ce este produsul

### 1.1 Obiectiv

SaaS B2B2C tip **„Shopify pentru dealeri auto”**:

- Fiecare dealer = **tenant** cu storefront public + dashboard.  
- Branding (culoare, template), stoc, lead-uri, rezervări.  
- Visite public pe subdomeniu / host; staff pe `/dashboard`.

### 1.2 Utilizatori

| Tip | Unde | Ce face |
|-----|------|---------|
| Vizitator | Storefront tenant | Caută, filtrează, compară, salvează, lead, sună |
| Staff dealer (`member` / `owner`) | `/dashboard` | Inventar, lead-uri, rezervări |
| Owner | Setări avansate | Branding, teme, firmă (parțial) |
| Platform (viitor) | Apex | Landing; billing — **out of scope** acum |

### 1.3 Scope exclus (oficial, overview)

- Mobile white-label complet  
- Marketplace sync, VIN decoder, leasing real, trade-in  
- Stripe / billing  
- Automatizare custom domains  
- Microservicii / K8s  
- Feature-uri AI  
- Commit/push/deploy fără cerere explicită a owner-ului  

---

## 2. Stack & principii

### 2.1 Stack aprobat (din cod)

| Layer | Choice |
|-------|--------|
| Monorepo | Turborepo + pnpm 9 · Node ≥ 20 |
| Language | TypeScript strict |
| Web | Next.js **16.3.x** App Router · React **19** · Turbopack `dev` |
| UI | Tailwind CSS **4** + `@auto-platform/ui` minimal (nu full shadcn) |
| Fonts | Geist Sans / Mono |
| DB | Supabase PostgreSQL + **Drizzle** |
| Auth | Supabase Auth + `@supabase/ssr` (cookies) |
| Validation | Zod (`@auto-platform/types`) |
| Media | Supabase Storage bucket `vehicle-media` (private, signed URLs) |
| Jobs | Abstraction noop (`InMemoryJobClient`) |
| Mobile | Expo placeholder |
| Tests | Vitest (`web` + `db`) |
| Hosting | Vercel (Hobby demo) |

### 2.2 Principii de arhitectură (obligatorii)

1. Logică de business **server-side** (Server Actions / handlers / utilitare).  
2. Browserul **nu** mutează DB-ul pe operații de business.  
3. Drizzle = schema + migrări + acces server.  
4. Supabase = infrastructură, nu stratul de domeniu.  
5. **RLS obligatoriu**, dar insuficient singur — membership/rol/tenant și în cod.  
6. **`service_role` interzis** pe path-uri user (excepție: signed media server-side).  
7. Operații sensibile → audit log.  
8. Path-uri multi-tenant → teste izolare cross-tenant.  
9. **`tenant_id` din client nu e sursă de adevăr** — doar Host + sesiune.

---

## 3. Structura monorepo

```text
aplicatie-masini/
├── apps/
│   ├── web/                 # Next.js — storefront + dashboard (PRODUSUL)
│   └── mobile/              # Expo placeholder
├── packages/
│   ├── db/                  # Drizzle schema, migrări, seed, RLS helpers, teste
│   ├── types/               # Zod + tipuri shared
│   ├── core/                # Domeniu: tenancy, vehicles, leads, reservations, jobs
│   ├── ui/                  # Button, Input, Label
│   └── config/              # ESLint / TS shared
├── docs/
│   ├── stages/00–12         # Documentație pe etape
│   ├── architecture.md
│   ├── database.md
│   ├── security.md
│   └── auth-tenancy.md
├── HANDOFF_ARHITECTURA.md   # Handoff scurt (parțial stale)
├── HANDOFF_Status_Actual_Aplicatie_Auto_Platform.md  # ACEST DOCUMENT
├── package.json / turbo.json / pnpm-workspace.yaml
└── .env.example             # Nume env — fără secrete
```

**Note:**

- Nu există `README.md` la root.  
- Nu există `.github/workflows` (fără CI GitHub).  
- `.npmrc`: `node-linker=hoisted` (mitigare Windows).  

---

## 4. Roadmap etape 0–13 (status real)

| Etapă | Document | Status REAL (7 oct 2026) |
|-------|----------|---------------------------|
| 0 Overview | `docs/stages/00-*.md` | Activ |
| 1 Monorepo | `01-*` | **Finalizată** |
| 2 Supabase + Drizzle + RLS | `02-*` | **Finalizată** |
| 3 Auth + multi-tenancy | `03-*` | **Finalizată** |
| 4 Vehicles + dashboard | `04-*` | **Finalizată** |
| 5 Public storefront | `05-*` | **Finalizată** |
| 6 Inventory data | `06-*` | **Finalizată** (6A–6C) |
| 7 Vehicle media | `07-*` | **Finalizată** local |
| 8 Catalog search | `08-*` | **Finalizată** local |
| 9 Design system + Template 1 | `09-*` | **Finalizată** + **refine UX extins** |
| 10 Public leads | `10-*` | **Finalizată** (email tot noop) |
| 11 Reservations | `11-*` | **Finalizată** (fără cron real) |
| 12 Hardening / deploy | `12-*` | **Hobby demo LIVE pe Vercel** (doc etapă outdated) |
| 13 Extra templates | — | **Neîncepută** |

### 4.1 Commits majore recente (cronologic)

| Hash | Mesaj | Semnificație |
|------|-------|--------------|
| `0ee0f6b` | complete multi-tenant MVP | Baza produsului |
| `9710745` | storefront leads reservations demo prep | Pregătire Etapa 12 |
| `a472c28` | HOBBY_DEMO env flags | Fix Vercel reserved env names |
| `6096e86` | storefront design + compare/saved/finance | Valul UI mare |
| `5f86187` | refine + quick sheets | Filtre tip Autovit |
| `06c8157` | template one + theme preview | Personalizare Teme |
| `5ec026e` | showcase vehicle covers | Imagini ACME showcase |
| `a258e56` | filters overlay + compare + detail | Fix stacking / layout |

---

## 5. Storefront public (Template 1) — inventar funcțional

### 5.1 Rute publice

| Rută | Rol |
|------|-----|
| `/` | Catalog (pe host tenant) sau landing apex |
| `/vehicles/[slug]` | Detaliu vehicul |
| `/salvate` | Mașini salvate (client) |
| `/compara` | Comparație 2–4 (client) |
| `#contact` / formular pe detaliu | Lead public (dacă enabled) |

### 5.2 Shell (`PublicStorefrontShell`)

- Header sticky: brand, CTA Sună / WhatsApp.  
- Desktop: linkuri Mașini / Salvate / Compară.  
- Mobil: bottom nav **Acasă · Mașini · Salvate · Compară · Sună** (`z-[90]` local).  
- Footer contacte.  
- Frame ~max 1200px.  
- Compare floating bar pe catalog.  
- Sticky contact pe detaliu.

### 5.3 Catalog — filtre & query

**Parametri GET acceptați:** `q`, `make[]`, `priceMin/Max`, `yearMin/Max`, `kmMin/Max`, `fuel`, `transmission`, `bodyType`, `sort`, `page`.  
**pageSize fix:** 12.  
**Interzise:** `tenant_id`, `vin`, `status`, etc.

**UI filtre:**

| Control | Comportament |
|---------|--------------|
| Tabs „În stoc / Urmează” | Vizual (În stoc activ; „Urmează” placeholder) |
| Search marcă/model | GET `q` |
| Pills Brand / Caroserie / Combustibil / Preț / An | Deschid **quick sheet** dedicat |
| „Toate filtrele” | Drawer / sheet ~80% cu formular complet |
| Desktop | Overlay absolut peste inventar (în afara `.sf-solid-card` — overflow:hidden clipuia) |
| Mobil | Sheet deasupra bottom nav + CTA „Vezi rezultate(le)” |
| Accordion în drawer | Combustibil, Cutie, Tip caroserie = `<details>` clickabile (**local, necommitat**) |
| Chips active | Eliminare per filtru + reset |
| Sort | Select în formular |
| Paginare | Catalog pagination |

### 5.4 Quick sheets (mobil / overlay)

- Brand (căutare + multi-select), Caroserie, Combustibil, Preț, An.  
- CTA: **Vezi rezultate**.  
- Închidere: **X**, tap pe fundal întunecat, Escape.  
- Animație: slide-up + fade backdrop (`catalog-filter-drawer-panel` / `-backdrop`) — **local**.  
- Nav de jos rămâne vizibil; sheet are clearance `4.5rem + safe-area`.

### 5.5 Compară & Salvate

- **Client-only** `localStorage`, cheie pe slug tenant.  
- Compară: min 2, max 4.  
- Floating bar: thumbs, CTA Compară, X dismiss (persistă până se golește selecția).  
- Fără DB.

### 5.6 Detaliu vehicul

- Galerie (signed media).  
- Highlights / preț / TVA / km / an.  
- Secțiuni numerotate **01 Finanțare · 02 Tehnic + Dotări · 03 Descriere** (fără tab bar sticky 01/02/03 — eliminat în refine).  
- Finanțare: estimare rată (APR chips, luni); „Aplică acum” = **doar UI local**, fără insert.  
- Share (Web Share / clipboard).  
- Salvează / Compară.  
- Carusel „Alte alternative” (Prev/Next; autoplay opțional pe mobil).  
- Lead form (honeypot + cooldown), dacă nu e dezactivat pe Hobby.

### 5.7 Template registry

- `template-1` = **ready**.  
- `template-2` = **coming_soon** (CSS preview only).  
- `primaryColor` din tenant → `--sf-accent` pe shell.

### 5.8 SEO

- Catalog `/` indexabil.  
- Query filtrate → noindex + canonical `/`.

---

## 6. Istoric UX Template 1 — ce s-a întâmplat (sesiuni recente)

### 6.1 Valul de design (≈ 6 oct)

- Redesign storefront Autovit-like.  
- Introducere Compară, Salvate, Finanțare.  
- Quick sheets pe homepage.  
- Deploy `5f86187` → Vercel.

### 6.2 Personalizare + preview (≈ 7 oct dimineață)

- Settings: General / Echipă / Firmă / **Personalizare** (Teme · Pagini · Preferințe).  
- Galerie teme + aplicare Template 1.  
- Demo storefront izolat (`demo-storefront-data.ts`, imagini `public/demo-vehicles/`).  
- Preview auth `/storefront-template-preview`.  
- Commit `06c8157`.

### 6.3 Showcase cars ACME

- Maserati GranTurismo, Audi RS6, Koenigsegg CCX.  
- Covers atașate Storage via script `attach-showcase-covers.mts`.  
- Arhivare „Test Reservation” (parțial — unele pot rămâne).  
- Commit `5ec026e`.  
- **Notă:** Golf din seed poate încă apărea; covers = one-off, nu migrare.

### 6.4 Redesign filtre + detail (7 oct)

Probleme rezolvate în `a258e56` și post-commit local:

| Problemă | Cauză | Rezolvare |
|----------|-------|-----------|
| Dropdown desktop „mort” | `.sf-solid-card { overflow:hidden }` | Overlay în afara cardului |
| Continuă sub bottom nav | Stacking: filters `z-30` vs nav `z-40` | Clearance + z-index ridicat când overlay open; nav `z-90` |
| Portal pe `body` | Pierdea `--sf-accent` → buton alb pe alb | Rămâne în arborele temei |
| Lipsa dismiss | Sheet 100% înălțime | max ~80% + X + backdrop |
| Continuă naming | Copy greșit | **Vezi rezultate** |
| 01/02/03 tab bar | Cerință redesign | Eliminat; headings de secțiune |
| Compare pill | Preferință X | `compare-bar-dismiss.ts` |

### 6.5 Lucru LOCAL necommitat (după `a258e56`)

Fișiere modificate:

1. `apps/web/src/app/globals.css` — animații drawer (320ms slide, 280ms fade; reduced-motion).  
2. `catalog-quick-sheets.tsx` — clearance nav, X, Vezi rezultate, animații, Escape.  
3. `catalog-filter-drawer.tsx` — același model pentru „Toate filtrele”; `z-[100]` când overlay open.  
4. `catalog-filters.tsx` — accordion Combustibil / Cutie / Tip caroserie.  
5. `public-shell.tsx` — nav mobil `z-[90]`.

**Acțiune necesară pentru Vercel:** commit + `git push origin master` (doar la cererea ta).

---

## 7. Dashboard dealer

### 7.1 Navigare primară

Prezentare · Vehicule · Rezervări · Lead-uri · Setări.

### 7.2 Inventar

- Listă, create, edit, status, archive.  
- Galerie media (upload Storage).  
- VIN **doar staff** (nu în DTO public).  
- Gate publish → `available` la nivel app (Zod), nu NOT NULL DB.

### 7.3 Lead-uri

- Listă + detaliu.  
- Status / assign.  
- Sursă: formular public.  
- Anti-spam: honeypot + cooldown + rate-limit IP (in-memory).  
- Notificare email: **noop**.

### 7.4 Rezervări

- Create / cancel / convert.  
- TTL 48h; unique partial pe vehicul `active`.  
- Expirare: **lazy** la access (job `reservation.expire` inactiv).

### 7.5 Setări (status pe subsecțiuni)

| Secțiune | Rol | Status |
|----------|-----|--------|
| General (profil) | Orice member | Activ |
| Echipă | Owner | **Read-only**; invite/role/remove disabled |
| Detalii firmă | Owner | Doar **nume comercial**; restul „după migrare” |
| Personalizare → Teme | Owner | Galerie + apply Template 1 + preview |
| Personalizare → Pagini | Owner | **Placeholder** (fără CMS) |
| Personalizare → Preferințe | Owner | Branding/contact; SEO/favicon/analytics **inactive** |

Branding update: owner only + audit `tenant.branding.update`.

---

## 8. Multi-tenancy, auth, securitate

### 8.1 Rezolvare tenant = Host ONLY

| Mediu | Host | Rezultat |
|-------|------|----------|
| Local | `localhost:3000` | Apex (fără tenant) |
| Local | `acme.localhost:3000` | Tenant `acme` |
| Local | `beta.localhost:3000` | Tenant `beta` |
| Producție reală | `{slug}.{root}` | Același model |
| Vercel Hobby | Apex `*.vercel.app` | Fallback **doar** dacă TOATE gate-urile `HOBBY_DEMO_*` trec → slug seed (ex. `acme`) |

Fail-closed: lipsește orice flag → fără tenant pe apex.

### 8.2 Lanț auth → tenant

Auth cookie → `profiles.id` → Host → `tenants.slug` → `memberships` → `withTenantContext({ profileId, tenantId })`.

### 8.3 Guards

- Middleware: refresh sesiune; `/dashboard/*` → `/login` dacă neautentificat.  
- Layout dashboard: re-check membership.  
- `requireMembership`, `requireRole` / `requireMinimumRole`, `assertTenantAccess`, `assertSameTenant`.  
- Identity: `supabase.auth.getUser()` (nu doar cookie session).

### 8.4 RLS

- GUC-uri `app.profile_id`, `app.tenant_id`.  
- ENABLE + FORCE pe tabele business.  
- Anon SELECT pe `tenants` active|trial (migrare `0002`) pentru storefront.  
- Defense in depth: RLS + server asserts.

### 8.5 Audit

`writeAuditLog()` append-only pe operații sensibile (ex. branding).

---

## 9. Date, RLS, media, seed

### 9.1 Tabele principale

`tenants`, `profiles`, `memberships`, `vehicles`, `vehicle_media`, `leads`, `reservations`, `audit_logs`, `tenant_features`.

### 9.2 Migrări Drizzle

| # | Conținut |
|---|----------|
| `0000` | Schema / enums / indexes |
| `0001` | RLS helpers + policies |
| `0002` | Public storefront SELECT tenants |
| `0003` | Atribute inventar |

### 9.3 Storage

- Bucket privat `vehicle-media`.  
- Path: `{tenant_id}/{vehicle_id}/{media_id}.{ext}`.  
- SQL manual: `packages/db/supabase/vehicle-media-storage.sql`.  
- Signed URLs via service role **doar server**.

### 9.4 Seed

- Tenants: **ACME Motors** (`acme`), **Beta Autos** (`beta`).  
- Inventar demo + showcase.  
- Profile seed IDs via env (`SEED_PROFILE_A_ID` / `B`).

---

## 10. Demo vs live (ACME)

| Suprafață | Surse date | Observații |
|-----------|------------|------------|
| Theme demo preview | `DEMO_VEHICLES` / `DEMO_DEALER` + `public/demo-vehicles/` | **Zero** Supabase/tenant |
| `/storefront-template-preview` | Poate lista vehicule reale (auth) | Iframe preview |
| Live ACME local | `acme.localhost:3000` → DB | Seed + media reale |
| Live Hobby Vercel | Apex → `HOBBY_DEMO_TENANT_SLUG=acme` | Un tenant; leads pot fi off |

Regulă: modulul demo **nu** trebuie să încarce date tenant.

---

## 11. Deploy, env, calitate

### 11.1 Vercel

- Root `.` · Node 20 · `pnpm install` · `pnpm --filter @auto-platform/web build`.  
- Auto-deploy din `master`.  
- Deployment Protection: **off** pentru demo public.  
- URL: https://auto-platform-beige.vercel.app  

### 11.2 Env (nume only — fără valori)

**Public:** `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ROOT_DOMAIN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_MEDIA_BUCKET`.

**Server:** `DATABASE_URL`, `DATABASE_URL_MIGRATIONS`, `SUPABASE_SERVICE_ROLE_KEY`, `LEAD_EMAIL_PROVIDER`, `LEAD_RATE_LIMIT_SECRET`, `HOBBY_DEMO_ONLY`, `HOBBY_DEMO_TENANT_SLUG`, `HOBBY_DEMO_DISABLE_PUBLIC_LEADS`, `TRUSTED_PROXY`, `SEED_PROFILE_*`.

**Platform:** `VERCEL`, `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`.

**Atenție:** nu folosi prefixul rezervat `VERCEL_DEMO_*` — s-a trecut la `HOBBY_DEMO_*`.

### 11.3 Calitate locală

| Comandă | Rol |
|---------|-----|
| `pnpm lint` | Lint turbo |
| `pnpm typecheck` | Typecheck |
| `pnpm --filter @auto-platform/web test` | Vitest web (inclusiv `template1-ux-refinements.test.ts`) |
| `pnpm db:test` | Izolare RLS / publish (online dacă DB + seed) |
| `pnpm --filter @auto-platform/web build` | Build producție |

**CI GitHub:** inexistent — calitatea = local + build Vercel.  
**Warning Next cunoscut:** `middleware` → viitor `proxy`.

---

## 12. Gaps cunoscute & datorii tehnice

### 12.1 Produs / UI incomplete

- Pagini CMS, SEO/favicon/analytics settings.  
- Team invite / change role / remove.  
- Detalii firmă (câmpuri legale) — așteaptă migrare.  
- Template 2.  
- Finanțare „Aplică acum” fără persistare.  
- Tab „Urmează în stoc” fără flux real.  
- Mobile Expo.

### 12.2 Infrastructură

- Email leads (Resend etc.) neimplementat.  
- Rate-limit ne-distribuit.  
- Cron rezervări absent.  
- Jobs abstraction = noop.  
- Custom domains: coloană există, fără automatizare.  
- Fără Stripe/billing.

### 12.3 Conținut / date

- Posibile „Test Reservation” / Golf rămase în catalog.  
- Showcase covers = operațiune one-off Storage.  
- Imagini lipsă pe unele vehicule → „Imagine indisponibilă”.

### 12.4 Documentație stale

- `HANDOFF_ARHITECTURA.md` → hash `5f86187`.  
- `docs/stages/12-hardening-deploy.md` → „fără deploy”.  
- Overview etapă 12 tot „pregătire”.

### 12.5 UX QA istoric (poate parțial rezolvat)

- Lag URL după aplicare filtru.  
- Overlay click-through pe carduri (înainte de fix absolute).  
- Stare activă Salvate în nav.  
- Slider preț 18900 vs 18990.

---

## 13. Ce va mai fi — recomandări prioritizate

### P0 — Stabilizare demo (1–2 zile)

1. Commit + push polish filtre (animații, accordion, X/backdrop).  
2. Sync docs handoff / etapa 12.  
3. Curățare catalog ACME (archive Test Reservation rămase; covers lipsă).  
4. Smoke test pe Vercel mobil: Brand sheet, Toate filtrele, Compară, Detaliu.

### P1 — Hardening înainte de multi-tenant real

1. Email lead real + feature flag.  
2. Rate-limit distribuit (Upstash sau echivalent).  
3. Cron / job pentru expirare rezervări.  
4. Migrare `middleware` → `proxy` când Next o cere.  
5. CI minimal (typecheck + web test pe PR).

### P2 — Setări dealer complete

1. Team invites.  
2. Schema + UI detalii firmă.  
3. Preferințe SEO de bază.  
4. CMS „Pagini” minimal (despre / contact) sau ascunde meniul.

### P3 — Produs

1. Etapa 13 — Template 2 (+ selecție reală).  
2. Finanțare → lead dedicat sau partner.  
3. „Urmează în stoc” ca status real.  
4. Sold page / redirect SEO.  
5. Custom domains (manual docs apoi automatizare).

### P4 — Viitor (scope exclus acum)

Billing, mobile white-label, VIN decoder, marketplace, AI.

---

## 14. Cum trebuie să funcționeze (contracte / reguli)

### 14.1 Tenancy

- Tenant **doar** din Host (sau Hobby gate explicit).  
- Niciodată `?tenant_id=` din client.  
- Storefront pe apex fără Hobby → landing, nu catalog altui dealer.

### 14.2 Date publice

- Doar vehicule `available`.  
- DTO whitelist: fără id intern tenant, plan, VIN, branding brut.  
- Media: URL semnate, pe termen scurt.

### 14.3 Filtre

- State = URL (shareable, back-button).  
- Quick sheet aplică + `page=1`.  
- Mobil: CTA deasupra nav; nav vizibil; dismiss prin X/backdrop.

### 14.4 Compară / Salvate

- Per-tenant în localStorage.  
- Nu amesteca ACME cu Beta.  
- Compară disabled sub 2 selecții.

### 14.5 Demo preview

- Zero call Supabase în `demo-storefront-data`.  
- Lead disabled în preview UI.

### 14.6 Securitate

- `service_role` doar server media/signing.  
- Orice write business: membership + tenant match + RLS.  
- Audit pe branding (și pe alte mutări sensibile pe măsură ce apar).

### 14.7 Deploy

- Push pe `master` = deploy Vercel.  
- Fără force-push pe master.  
- Fără commit secrete (`.env*`).  
- Commit doar la cererea owner-ului.

---

## 15. Checklist verificare manuală

### Local

- [ ] `pnpm --filter web dev`  
- [ ] `http://acme.localhost:3000/` — catalog  
- [ ] Brand sheet: X, backdrop, Vezi rezultate deasupra nav, animație  
- [ ] Toate filtrele: accordion Combustibil/Cutie/Caroserie  
- [ ] Desktop: overlay filtre nu mută layout inventar  
- [ ] Compară 2–4 + dismiss bar  
- [ ] Salvate  
- [ ] Detaliu: 01/02/03 headings, finance, alternative, share  
- [ ] `http://localhost:3000/` — apex landing  
- [ ] Login → `/dashboard` inventar / leads / reservations / teme  

### Vercel (după push)

- [ ] https://auto-platform-beige.vercel.app  
- [ ] Același flow mobil ca mai sus  
- [ ] Lead: comportament conform `HOBBY_DEMO_DISABLE_PUBLIC_LEADS`  
- [ ] Imagini showcase prezente  

### Calitate

- [ ] `pnpm typecheck`  
- [ ] `pnpm --filter @auto-platform/web test`  
- [ ] `pnpm --filter @auto-platform/web build`  

---

## 16. Hărți de fișiere cheie

### Storefront

- `apps/web/src/components/storefront/public-shell.tsx`  
- `catalog-filter-drawer.tsx` · `catalog-quick-sheets.tsx` · `catalog-filters.tsx`  
- `public-vehicle-detail.tsx` · `vehicle-finance-panel.tsx` · `vehicle-alternatives-carousel.tsx`  
- `compare-floating-bar.tsx` · `lib/storefront/compare-bar-dismiss.ts`  
- `lib/storefront/catalog-query.ts` · `templates/registry.ts` · `demo/demo-storefront-data.ts`  
- `apps/web/src/app/globals.css`  

### Dashboard / teme

- `apps/web/src/app/dashboard/**`  
- `components/dashboard/themes/**`  
- `lib/dashboard/nav.ts` · `settings-nav.ts`  

### Tenancy / auth

- `lib/tenant/resolve-tenant-from-host.ts` · `vercel-demo-only.ts`  
- `lib/auth/*` · `middleware.ts` · `lib/supabase/*`  

### DB

- `packages/db/src/schema/*` · `drizzle/0000–0003*` · `src/rls.ts` · `seed/dev-tenants.ts`  
- `supabase/vehicle-media-storage.sql`  

### Docs

- `docs/stages/00–12` · `architecture.md` · `database.md` · `security.md` · `auth-tenancy.md`  
- `HANDOFF_ARHITECTURA.md` (scurt, stale)  
- **Acest fișier** (status consolidat)

---

## 17. Glosar

| Termen | Sens |
|--------|------|
| Tenant | Dealer / organizație izolată |
| Host-based tenancy | Identitate tenant din hostname |
| Hobby demo | Un tenant pe apex Vercel via env gates |
| Template 1 | Singurul template storefront `ready` |
| Quick sheet | Bottom sheet pe un singur tip de filtru |
| DTO public | Formă de date sigură pentru browser |
| RLS | Row Level Security Postgres |
| Lazy expiry | Expirare rezervare la următorul access, nu cron |
| Showcase | Mașini demo cu imagini atașate Storage |

---

## Anexă A — Timeline scurt (5–7 oct 2026)

1. **5 oct** — MVP multi-tenant + prep demo.  
2. **6 oct** — Hobby live pe Vercel; redesign storefront; Compară/Salvate/Finanțare; quick sheets.  
3. **7 oct dim.** — Personalizare Teme; refine Template 1; showcase + covers.  
4. **7 oct seară** — Fix overlay filtre / compare / detail → `a258e56` push.  
5. **7 oct noapte** — Polish local: animații, dismiss X+backdrop, accordion „Toate filtrele”, nav z-index — **pending commit**.  
6. **7 oct** — Acest handoff de status actual.

---

## Anexă B — Întrebări de decis cu owner-ul

1. Push acum polish-ul local pe Vercel?  
2. Următorul focus: hardening (email/cron/CI) sau Template 2 sau curățare catalog?  
3. Lead-urile pe Hobby rămân dezactivate?  
4. Păstrăm Golf / Test Reservation în ACME sau curățăm agresiv?  
5. Actualizăm și `HANDOFF_ARHITECTURA.md` ca redirect scurt către acest document?

---

*Sfârșitul documentului — Status Actual Aplicație Auto Platform.*  
*Pentru detalii de etapă istorică, vezi `docs/stages/`. Pentru secrete, vezi doar `.env.local` local — nu le copia aici.*
