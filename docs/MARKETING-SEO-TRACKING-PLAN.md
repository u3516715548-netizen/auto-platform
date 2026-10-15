# Marketing + SEO + Tracking + Consent â€” Plan de produs (Etapa 0)

**Data:** 2026-10-15 (Europe/Bucharest)
**Status:** Phase 2â€“8 APROBATE Â· release GitHub pe `master` (fÄƒrÄƒ migrÄƒri Production / fÄƒrÄƒ DNS / fÄƒrÄƒ `vercel --prod`) Â· deploy Production doar dupÄƒ runbook + aprobare owner


**Produs:** Autobear / Auto Platform (multi-tenant B2B2C)
**BazÄƒ audit:** `master` @ `887f607` + schema 0013 (23A) + handoff-uri 23A/audit 9 oct

### Decizii owner (2026-10-15) â€” blocate
1. **Nav:** Marketing top-level (nu sub Personalizare) â€” Phase 3
2. **Custom scripts:** NU Ã®n v1 â€” doar IDs (GTM/GA4/Ads/Meta/TikTok/LinkedIn) + verification tags
3. **Consent:** first-party CMP Ã®n v1
4. **Vizibilitate IDs:** owner-only
5. **`/compara` + `/salvate`:** noindex forÈ›at
6. **Ordine:** Consent Ã®nainte de Tracking live pe Production
7. **Ordine faze:** SEO Core â†’ Marketing Settings â†’ Consent â†’ Tracking/Events â†’ Content SEO â†’ Health â†’ QA


---

## 1. Executive summary

### Ce vrem
Fiecare dealer (tenant) sÄƒ Ã®È™i administreze din dashboard: **SEO**, **tracking/ads**, **consent**, **snippet-uri controlate**, fÄƒrÄƒ deploy â€” izolat pe Host, owner-only, fÄƒrÄƒ leak Ã®ntre tenants.

### Ce existÄƒ deja (confirmat din cod)
Etapa **23A** este livratÄƒ È™i pe Production:
- `tenant_seo_settings` + `tenant_pages` (CMS) + RLS FORCE + owner write
- `generateMetadata` pe catalog / vehicle / CMS
- Query pe catalog â†’ **noindex** + canonical `/`
- Favicon per tenant (opÈ›ional) via Metadata
- UI: PreferinÈ›e SEO + Pagini CMS sub Personalizare

### Ce lipseÈ™te Ã®ncÄƒ (vs plan complet / post-launch)
- Search Console API / health history / cron
- CSP headers platformÄƒ
- Custom scripts allowlist (decizie: NU Ã®n v1)
- Apex Autobear marketing tracking (separat)

### Livrat Phases 2â€“8 (local)
- `robots.txt` / `sitemap.xml` per Host, OG/Twitter/JSON-LD
- Marketing nav + IDs + verification
- Consent CMP + Consent Mode + gated tracking + events
- Content SEO / landing pe `tenant_pages`
- SEO Health on-demand owner-only
- Phase 8: QA matrix + production readiness + handoff 32 (fÄƒrÄƒ deploy)

### Recomandare de ordine (dupÄƒ aprobare)
1. **SEO Core (23B-like)** â€” valoare imediatÄƒ, risc mic
2. **Marketing Settings shell + Tracking IDs** â€” model de date
3. **Consent Mode + banner** â€” Ã®nainte de a Ã®ncÄƒrca pixeli Ã®n Production
4. **Script loader gated** â€” pe baza consent
5. **Event taxonomy** â€” pe storefront
6. **Content SEO governance** â€” pe CMS existent
7. **Health checks** â€” pe metadata + public routes
8. **QA / docs**

**Nu** Ã®ncepe cu custom scripts arbitrare sau CAPI server-side â€” risc È™i complexitate mari.

---

## 2. Current state (audit)

### 2.1 Confirmat din cod

| ZonÄƒ | Dovezi |
|------|--------|
| Root layout / metadata icons | `apps/web/src/app/layout.tsx` |
| Storefront shell | `components/storefront/public-shell.tsx` |
| Marketing shell (apex) | `components/marketing/saas-shell.tsx` |
| Catalog SEO | `lib/storefront/catalog-seo.ts` â€” query â†’ noindex |
| SEO settings CRUD | `lib/seo/*`, form pe PreferinÈ›e |
| CMS | `lib/cms/*`, `/p/[slug]`, dashboard Pagini |
| Public SEO load | `app.public_seo_settings(uuid)` SECURITY DEFINER |
| Owner guards | `requireSettingsOwner`, `SETTINGS_OWNER_ROLES`, RLS owner write |
| Company profile (LocalBusiness later) | `tenant_company_profiles` + `PublicCompanyView` |
| Filter index policy | orice query string pe `/` â†’ noindex |

### 2.2 Presupus (nu verificat exhaustiv Ã®n runtime Production)
- CÄƒ `indexing_enabled=false` e respectat pe toate rutele publice Ã®n toate edge cases
- CÄƒ dealerii folosesc CMS kinds legale (`termeni`, `cookies`) fÄƒrÄƒ footer links automate (footer legal **nu** leagÄƒ automat `/p/...` â€” confirmat absent)
- CÄƒ Production are migrarea 0013 aplicatÄƒ (presupunere rezonabilÄƒ din deploy-uri recente)

### 2.3 LipsÄƒ confirmatÄƒ
Vezi executive summary. Plus: zero deps `@next/third-parties`, zero `next/script` marketing, zero tabele analytics.

### 2.4 Conflicte / tensiuni cu patterns actuale

| Tensiune | Detaliu |
|----------|---------|
| **Anon SELECT pe `tenants`** | De aceea SEO e tabel separat + SECURITY DEFINER â€” **pÄƒstrÄƒm** acelaÈ™i pattern pentru marketing secrets |
| **Custom scripts** | CMS body e escaped (fÄƒrÄƒ HTML). Injection head/body e **contrar** filozofiei 23A â€” trebuie sandbox/allowlist/owner + audit |
| **Host-only** | Tracking IDs trebuie Ã®ncÄƒrcate din tenant Host, niciodatÄƒ din query |
| **Consent vs lead forms** | ExistÄƒ deja checkbox-uri pe lead/finance (marketing emails) â€” **nu** Ã®nlocuiesc CMP cookie |
| **Nav actual** | SEO e Ã®ngropat Ã®n PreferinÈ›e; un â€žMarketing Centerâ€ mare trebuie adaptat la `settings-nav.ts` |
| **Apex vs tenant** | Marketing settings = **doar tenant storefront**, nu landing Autobear (apex) |

### 2.5 FiÈ™iere relevante (listÄƒ exactÄƒ)

**Layouts / shells**
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/dashboard/layout.tsx`
- `apps/web/src/app/dashboard/settings/layout.tsx`
- `apps/web/src/components/storefront/public-shell.tsx`
- `apps/web/src/components/marketing/saas-shell.tsx`

**SEO / metadata**
- `apps/web/src/lib/seo/get-seo-settings.ts`
- `apps/web/src/lib/seo/upsert-seo-settings.ts`
- `apps/web/src/lib/seo/load-public-seo-settings.ts`
- `apps/web/src/lib/seo/build-page-metadata.ts`
- `apps/web/src/lib/storefront/catalog-seo.ts`
- `apps/web/src/components/dashboard/seo-settings-form.tsx`
- `apps/web/src/app/page.tsx`, `vehicles/[slug]/page.tsx`, `p/[slug]/page.tsx`, `compara/page.tsx`, `salvate/page.tsx`

**CMS**
- `apps/web/src/lib/cms/*`
- `apps/web/src/components/dashboard/cms-pages-manager.tsx`, `cms-page-edit-form.tsx`
- `apps/web/src/app/dashboard/settings/customization/pages/**`
- `apps/web/src/app/p/[slug]/page.tsx`

**Auth / nav**
- `apps/web/src/lib/auth/require-settings-owner.ts`
- `apps/web/src/lib/auth/require-role.ts`
- `apps/web/src/lib/dashboard/settings-nav.ts`

**DB**
- `packages/db/src/schema/tenant-seo-settings.ts`
- `packages/db/src/schema/tenant-pages.ts`
- `packages/db/src/schema/tenant-company-profiles.ts`
- `packages/db/drizzle/0013_tenant_pages_and_seo_settings.sql`
- `packages/db/src/__tests__/tenant-pages.isolation.test.ts`

**Docs existente**
- `docs/handoffs/23a-cms-legal-pages-basic-seo.md`
- `docs/handoffs/audit-9-octombrie-2026.md`
- `docs/handoffs/22-company-details.md`

### 2.6 Modele / tabele existente vs de construit

| ExistÄƒ | De construit (propunere) |
|--------|---------------------------|
| `tenant_seo_settings` (title/desc/favicon/indexing) | Extindere SEO: OG defaults, title templates, twitter, robots extras **sau** coloane JSON controlate |
| `tenant_pages` | Kinds/landing governance; eventual `seo_noindex` per page |
| `tenant_company_profiles` | Consum pentru LocalBusiness JSON-LD |
| â€” | `tenant_marketing_integrations` (GTM/GA4/pixels/Ads IDs, env flags) |
| â€” | `tenant_marketing_scripts` (snippets allowlisted, placement, consent category) |
| â€” | `tenant_consent_settings` + optional `tenant_consent_events` (audit minimal) |
| â€” | `tenant_seo_health_snapshots` (optional, Phase 7) |

---

## 3. Target architecture

```text
Host â†’ resolve tenant
  â†’ load PublicSeoSettings (+ company for JSON-LD)
  â†’ load MarketingIntegrations (IDs only, no secrets in HTML if avoidable)
  â†’ load ConsentSettings
  â†’ render Metadata (Next) + JSON-LD
  â†’ render Consent banner (client)
  â†’ if consent: load GTM/GA/pixels via controlled ScriptLoader
  â†’ emit standard events (dataLayer / gtag) without PII
```

### Principii
1. **Tenant isolation:** tabele cu `tenant_id`, FORCE RLS, public via SECURITY DEFINER whitelist (ca 23A).
2. **Owner-only** mutate (acelÈ™i pattern ca PreferinÈ›e/Pagini).
3. **GTM-first:** dealerii preferÄƒ GTM container; pixeli nativi = fallback + Ads IDs.
4. **Consent before marketing scripts** (necessary always on).
5. **No arbitrary JS by default** â€” Phase Scripts = allowlist tipuri + length limits + optional kill-switch env.
6. **Apex Autobear** rÄƒmÃ¢ne separat (eventual tracking platformÄƒ ulterior; out of MVP tenant Marketing Center).

### Nav dashboard (adaptare propusÄƒ)

Structura ta â€žMarketing â†’ â€¦â€ e corectÄƒ ca IA, dar nav-ul actual e sub **Personalizare**. Propunere:

**OpÈ›iunea A (recomandatÄƒ):** item nou owner-only Ã®n `SETTINGS_NAV`:

```text
Marketing
  Overview
  SEO
  Analytics & Tags
  Consent
  Scripts (advanced)
  SEO Health
```

PÄƒstreazÄƒ **Pagini** (CMS) la Personalizare (conÈ›inut) + link cross din Marketing â†’ SEO Content.
PreferinÈ›e SEO actuale **migreazÄƒ UI** cÄƒtre Marketing â†’ SEO (datele rÄƒmÃ¢n Ã®n `tenant_seo_settings`).

**OpÈ›iunea B:** totul sub Personalizare â†’ Marketing (mai puÈ›in vizibil).

â†’ **Decizie owner necesarÄƒ** (vezi Open questions).

---

## 4. Phased implementation plan

### PHASE 1 â€” Audit + Architecture
| | |
|--|--|
| **Scop** | Acest document + aliniere decizii |
| **FiÈ™iere** | `docs/MARKETING-SEO-TRACKING-PLAN.md` (acesta) |
| **MigrÄƒri** | Nu |
| **UI** | Nu |
| **Riscuri** | Scope creep â€” È›inem faze mici |
| **Acceptare** | Owner aprobÄƒ plan + rÄƒspunde la Open questions |

---

### PHASE 2 â€” SEO Core (extindere 23A â†’ 23B)
| | |
|--|--|
| **Scop** | robots.txt + sitemap.xml per Host; OG/Twitter; JSON-LD sigur; title/meta templates; indexing controls rafinate |
| **FiÈ™iere estimate** | `app/robots.ts`, `app/sitemap.ts`; `lib/seo/*`; `build-page-metadata.ts`; `catalog-seo.ts`; vehicle/CMS metadata; PreferinÈ›e/Marketing SEO forms; teste |
| **MigrÄƒri** | Extindere `tenant_seo_settings`: `title_template`, `description_template`, `og_image_path`, `twitter_handle?`, `robots_extra?` (JSON controlat) â€” **sau** jsonb `seo_advanced` validat Zod |
| **UI** | Marketing â†’ SEO (sau PreferinÈ›e extinse): General, Titles & Meta, Social Preview, Sitemap & Indexing |
| **Server** | Loaders publice pe Host; regenerare metadata; fÄƒrÄƒ route handlers nesigure |
| **Riscuri** | Sitemap prea mare; filter URLs; schema Product greÈ™it â†’ rich results claim |
| **DependenÈ›e** | Company profile pentru LocalBusiness; `indexing_enabled` existent |
| **Teste** | Unit metadata templates; Host A vs B sitemap; query catalog noindex; typecheck/build |
| **Acceptare** | Pe tenant: `/robots.txt`, `/sitemap.xml` returneazÄƒ date corecte; OG pe vehicle; JSON-LD Organization/WebSite/Breadcrumb; Product/Offer **prudent** (doar dacÄƒ preÈ›+availability clare); VIN niciodatÄƒ Ã®n schema |

#### Strategie filtre (SEO)
**PÄƒstrÄƒm politica actualÄƒ ca default:** orice query pe catalog â†’ **noindex** + canonical homepage catalog.
**OpÈ›ional Phase 6:** pagini CMS/landing curate (`/p/bmw-iasi`) indexabile â€” **nu** indexÄƒm `?brand=bmw&fuel=diesel&â€¦` combinatorial.

#### Structured data â€” ce e â€žsigurâ€ vs prudent
| Tip | Recomandare |
|-----|-------------|
| `Organization` / `WebSite` / `BreadcrumbList` / `WebPage` | **Sigur** de implementat |
| `AutoDealer` / `LocalBusiness` | **Sigur** dacÄƒ avem adresÄƒ/telefon din company profile |
| `Product` + `Offer` pe detaliu | **Prudent** â€” doar cu name, url, image, priceCurrency, price, availability; fÄƒrÄƒ VIN; fÄƒrÄƒ promisiuni rich results |
| Vehicle listing specific Google | **Experimental / dependent** â€” documentÄƒm ca best-effort, nu garanÈ›ie |

---

### PHASE 3 â€” Marketing Settings Center â€” **DONE local (2026-10-15)**
| | |
|--|--|
| **Scop** | Nav top-level Marketing + model `tenant_marketing_integrations` + CRUD owner-only |
| **Migrare** | `0017_tenant_marketing_integrations.sql` |
| **Schema** | 1:1 pe `tenant_id`: GTM, GA4, Google Ads ID+label, Meta/TikTok/LinkedIn + enabled flags; GSC/Bing/Meta domain/Pinterest verification |
| **Permissions** | **Owner-only SELECT + write** (mai strict decÃ¢t SEO member SELECT â€” decizie owner: IDs doar owner) |
| **UI** | `/dashboard/settings/marketing` Overview Â· `/seo` (link PreferinÈ›e) Â· `/analytics` Â· `/verification` |
| **Runtime** | **Niciun** script GTM/GA/pixel pe storefront; fÄƒrÄƒ public SECURITY DEFINER |
| **Acceptare** | Unit + RLS isolation PASS; typecheck PASS; non-owner 404; fÄƒrÄƒ leak Aâ†’B |

#### Cum se testeazÄƒ Phase 3
1. Owner: SetÄƒri â†’ Marketing â†’ Overview / Analytics / Verification
2. SalveazÄƒ GTM `GTM-â€¦`, GA4 `G-â€¦`, clear = gol + Save
3. Non-owner: URL marketing â†’ 404
4. `pnpm --filter @auto-platform/db exec vitest run src/__tests__/tenant-marketing-integrations.isolation.test.ts`

---

### PHASE 4 â€” Consent & Tracking Runtime Foundation â€” **DONE local (2026-10-16)**
| | |
|--|--|
| **Scop** | CMP first-party + Consent Mode v2 defaults + gated GTM/GA4/pixels + verification meta pe homepage |
| **Migrare** | `0018_public_marketing_integrations.sql` â€” SECURITY DEFINER whitelist (tabelul rÄƒmÃ¢ne owner-only) |
| **Consent persist** | Cookie **host-only** `ab_consent` (Path=/; SameSite=Lax; Secure pe https; ~180 zile). **FÄƒrÄƒ** `Domain=.autobear.ro` ca sÄƒ nu amestece tenants pe subdomenii. |
| **Categorii** | necessary (always) Â· preferences Â· analytics Â· marketing â€” default denied except necessary |
| **Google Consent Mode v2** | `analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization` default denied â†’ update la Accept/Customize |
| **Load policy** | GTM-first: dacÄƒ GTM enabled+consent â†’ doar GTM. Native GA4/Ads/Meta/TikTok/LinkedIn doar dacÄƒ GTM lipseÈ™te + categoria relevantÄƒ. |
| **Verification** | `google-site-verification`, Bing `msvalidate.01`, Meta domain, Pinterest â€” pe homepage tenant via Metadata API |
| **UI** | Banner SSR fallback + client interactive; dashboard Marketing notice runtime |
| **NU Ã®n Phase 4** | Event taxonomy wiring Â· custom scripts Â· apex Autobear CMP Â· `tenant_consent_settings` editabile |
| **Acceptare** | Unit consent/load plan PASS; RLS public helper PASS; HTTP smoke: banner SSR, GSC izolat A/B, fÄƒrÄƒ GTM Ã®nainte de consent, compara noindex |

#### Contract Phase 5 (events) â€” **DONE** (vezi Phase 5 mai jos)

---

### PHASE 5 â€” Event Taxonomy & Data Layer Wiring â€” **DONE local (2026-10-16)**
| | |
|--|--|
| **Scop** | Taxonomie evenimente pe storefront public, gated de consent, GTM-first |
| **Emitter** | `lib/marketing/emit-marketing-event.ts` + sanitize whitelist |
| **Registry** | `tracking-runtime-registry.ts` â€” tenantSlug + consent + GTM/GA4 flags |
| **Naming** | dataLayer `event` = nume GA4-friendly **fÄƒrÄƒ** prefix `ab_`; namespace via `event_source: "autobear"` |
| **DestinaÈ›ii v1** | dataLayer (mereu cÃ¢nd consent permite); **GA4 direct** doar dacÄƒ GTM **nu** e path-ul activ; **fÄƒrÄƒ** Meta/TikTok/LinkedIn direct (doar prin GTM) |
| **Consent** | Conservator: fÄƒrÄƒ push dacÄƒ categoria cerutÄƒ e denied. Analytics events â†’ `analytics`. Conversion/click â†’ `analytics` **sau** `marketing`. |
| **Dedupe** | `page_view` / `view_item` / `view_item_list` / `search` / lead submit â€” chei once-per-view/submit |
| **Absent triggers** | `click_directions`, `reservation_start`, `reservation_submit` â€” contract only (fÄƒrÄƒ UI public) |
| **Acceptare** | Unit emit/sanitize/consent/destinations PASS; SEO regression PASS; typecheck PASS |

#### Event taxonomy (live)

| Event | Trigger | Consent | DestinaÈ›ii |
|-------|---------|---------|------------|
| `page_view` | App Router pathname | analytics | DL / GA4 |
| `view_item_list` | Catalog results | analytics | DL / GA4 |
| `view_item` | PDP | analytics | DL / GA4 |
| `search` | Catalog `q` non-empty | analytics | DL / GA4 |
| `compare_add` | Add to compare | analytics | DL / GA4 |
| `saved_vehicle` | Add to salvate | analytics | DL / GA4 |
| `finance_start` | Open finance dialog | analyticsâˆ¨marketing | DL / GA4 |
| `finance_submit` | Finance success | analyticsâˆ¨marketing | DL / GA4 |
| `contact_start` | Sticky Mesaj | analyticsâˆ¨marketing | DL / GA4 |
| `generate_lead` | Lead **sau** finance success | analyticsâˆ¨marketing | DL / GA4 |
| `click_phone` / `whatsapp` / `email` | tel/wa/mailto | analyticsâˆ¨marketing | DL / GA4 |
| `click_directions` | â€” | â€” | **absent** |
| `reservation_*` | â€” | â€” | **absent** (dashboard-only) |

Params whitelist: `tenant_slug`, `page_type`, `page_path`, `vehicle_slug`, `make`, `model`, `year`, `body_type`, `fuel_type`, `transmission`, `price`, `currency`, `list_*`, `search_term`, `filter_count`, `lead_type`, `contact_method`, `source_context`, `event_source`. **FÄƒrÄƒ PII.**

Manual verify: `window.dataLayer` dupÄƒ Accept all; Tag Assistant pe GTM; Network `gtag/js` doar pe path fÄƒrÄƒ GTM.

---

### PHASE 6 â€” Content SEO / Landing Pages â€” **DONE local (2026-10-16)**
| | |
|--|--|
| **Scop** | Extinde `tenant_pages` pentru landing SEO editoriale (fÄƒrÄƒ generator thin pages) |
| **Migrare** | `0019_tenant_pages_seo_landing.sql` â€” status `archived`; kinds inventar/financing/buyback/warranty/service; h1/intro/CTA/OG/canonical_path/noindex/sitemap/faq/filters/links |
| **URL** | RÄƒmÃ¢ne `/p/[slug]` (fÄƒrÄƒ tabel nou) |
| **Publish gates** | title+H1, meta 50â€“160, intro+body â‰¥120 chars; inventory â†’ filtre + â‰¥1 vehicul (block, nu silent noindex) |
| **Sitemap** | published âˆ§ Â¬noindex âˆ§ include_in_sitemap âˆ§ self-canonical âˆ§ conÈ›inut non-gol |
| **Canonical** | DB: path relativ valid; render: absolut pe Host; invalid â†’ self `/p/{slug}` |
| **JSON-LD** | WebPage + Breadcrumb + Org; FAQPage dacÄƒ FAQ vizibil; ItemList dacÄƒ lista inventar e vizibilÄƒ |
| **UI** | Personalizare â†’ Pagini (+ link din Marketing â†’ SEO); preview owner-only noindex |
| **NU** | AI generation, bulk pages, auto-combinÄƒri filtre, blog |
| **Acceptare** | Unit Phase 6 PASS; CMS/SEO regression PASS; RLS tenant_pages PASS; typecheck PASS; HTTP smoke A/B PASS |

---

### PHASE 7 â€” SEO Health & Validation â€” **DONE local (2026-10-16)**
| | |
|--|--|
| **Scop** | On-demand SEO health per tenant: critical / warning / passed / info + sumar numeric + scor intern Autobear (nu â€žGoogle scoreâ€) |
| **Engine** | `apps/web/src/lib/seo/health/` â€” `evaluate-seo-health` (pur), `run-seo-health` (owner session), `live-fetch` (Host), `summarize` |
| **UI** | `/dashboard/settings/marketing/health` â€” owner-only (`requireSettingsOwner`); link din Marketing â†’ SEO |
| **MigrÄƒri** | **Niciuna** â€” fÄƒrÄƒ `tenant_seo_health_runs` Ã®n v1 (raport pe request) |
| **Izolare** | `tenantId` doar din session; evaluator input-scoped; live fetch pe Host tenant |
| **NU** | Search Console API, AI content, reporting marketing avansat, apex Autobear marketing |

#### Metode pe check (static vs live)

| Check IDs | MetodÄƒ | De ce |
|-----------|--------|-------|
| `homepage_*`, `catalog_query_noindex` | Metadata builders (`buildPublicCatalogMetadata`) | Determinist, fÄƒrÄƒ HTTP |
| `cms_*` (title/H1/meta/thin/canonical/sitemap/FAQ/inventory) | DB rows + aceleaÈ™i reguli ca publish/sitemap Phase 6 | EvitÄƒ false positives pe HTML parÈ›ial |
| `vehicle_*` | Sample DB + regula Product JSON-LD Phase 2 | VIN/signed URL = contract builder, nu scrape |
| `compara_noindex` (metadata) | `buildForcedNoindexMetadata` | Regresie Phase 2 detectabilÄƒ offline |
| `marketing_ids_configured`, `verification_public_match` (builder) | Marketing integrations + `buildVerificationMetadata` | â€žnot configuredâ€ = info |
| `robots_*`, `sitemap_*`, `compara/salvate` live, `consent_*`, `tracking_*`, verification Ã®n HTML | Live HTTP Host â†’ `127.0.0.1` + Host header | ValideazÄƒ wiring real robots/sitemap/consent |
| `cms_draft_or_archived_public` | Live probe `/p/{draftSlug}` | Doar dacÄƒ draft existÄƒ È™i rÄƒspunde 200 |

#### SeveritÄƒÈ›i

| Severitate | SemnificaÈ›ie |
|------------|--------------|
| **Critical** | AcÈ›iune necesarÄƒ (ex. noindex Ã®n sitemap, canonical invalid, /compara indexabil) |
| **Warning** | ÃŽmbunÄƒtÄƒÈ›ire / risc (OG lipsÄƒ, GTM pre-consent detectat, consent banner nedetectat) |
| **Passed** | Check OK |
| **Info** | IntenÈ›ionat / neconfigurat (indexing off, GTM absent, verification absent) |

#### Scoring intern

`internalScore` 0â€“100 din counts: passed â†‘, critical â†“â†“, warning â†“ â€” **explicabil Autobear**, nu metricÄƒ Google.

#### Anti-false-positive

- noindex intenÈ›ionat â‰  problemÄƒ
- verification/Pinterest neconfigurat = info
- GTM neconfigurat = info
- draft exclus din sitemap = OK
- FAQ absent pe paginÄƒ fÄƒrÄƒ FAQ = skip
- sitemap: inspecteazÄƒ doar `<loc>` (nu `?` din `<?xml`)

#### LimitÄƒri

- Live fetch necesitÄƒ web server; eÈ™ecuri â†’ warning, nu crash UI
- Consent/GTM pe HTML SSR poate avea fals pozitiv dacÄƒ cookie deja setat (probe cookie-less)
- FÄƒrÄƒ istoric runs / cron
- AutoDealer JSON-LD lipsÄƒ adresÄƒ = nu e check dedicat critical Ã®n v1

| **Acceptare** | Unit seo-health PASS; owner-only nav; typecheck; smoke A/B fÄƒrÄƒ leak; Phase 2â€“6 regression pe scope |

---

### PHASE 8 â€” Final QA / Hardening / Production Readiness â€” **DONE local (2026-10-16)**
| | |
|--|--|
| **Scop** | Audit final lanÈ› SEOâ†’Health: securitate, SEO, env/config, QA manual, validare externÄƒ, release checklist â€” **fÄƒrÄƒ** features noi |
| **Docs** | `docs/handoffs/32-final-qa-production-readiness.md` Â· `docs/QA-MARKETING-SEO.md` Â· `docs/PRODUCTION-READINESS-MARKETING.md` Â· `docs/PRODUCTION-DEPLOYMENT-RUNBOOK.md` |
| **VerificÄƒri automate (local)** | 90 unit (Phases 2â€“7 scope) PASS Â· RLS isolation 12 PASS Â· typecheck PASS Â· smoke Phase 6+7 A/B PASS |
| **NU** | AI, bulk content, Search Console API, reporting avansat, apex Autobear marketing, commit/push/deploy |
| **Acceptare** | Raport findings + checklists; deploy doar dupÄƒ aprobare owner + migrÄƒri Prod + env/DNS |

**Surse externe confirmate (2026-10-16):**
- [URL Inspection](https://support.google.com/webmasters/answer/9012289) â€” indexability, structured data, sitemap discovery; live test â‰  indexed view
- [Core Web Vitals](https://support.google.com/webmasters/answer/9205520) â€” Good: LCP â‰¤2.5s, INP â‰¤200ms, CLS â‰¤0.1 (field/CrUX)

---

## 5. Security / permissions

| AcÈ›iune | Cine |
|---------|------|
| CiteÈ™te / scrie marketing IDs (dashboard) | **owner only** (decizie 2026-10-15) |
| Scrie SEO settings / CMS pages / SEO Health | **owner only** (`requireSettingsOwner` / `requireRole`) |
| Public citeÈ™te IDs necesare runtime | `app.public_marketing_integrations` / `app.public_seo_settings` (whitelist) |
| Custom scripts | **NU Ã®n v1** |
| Kill-switch platform | neimplementat ca env dedicat; disable per-tenant via toggles `*_enabled` |

**Nu** stocÄƒm access tokens Meta CAPI Ã®n v1 (server-side CAPI = fazÄƒ ulterioarÄƒ).

---

## 6. Consent model (rezumat)

```text
Default: analytics=denied, marketing=denied, preferences=denied, necessary=granted
User grants â†’ update Consent Mode â†’ enable ScriptLoader categories
Persist: cookie first-party `ab_consent` (tenant-scoped name) + version
```

Lead form â€žmarketing emailsâ€ rÄƒmÃ¢ne **separat** (comunicare), nu Ã®nlocuieÈ™te cookie consent.

---

## 7. SEO model (rezumat)

| Surface | Index | Canonical |
|---------|-------|-----------|
| `/` catalog clean | dacÄƒ `indexing_enabled` | `/` |
| `/` + orice query | **noindex** | `/` |
| `/vehicles/[slug]` | dacÄƒ indexing + available | `/vehicles/{slug}` |
| `/p/[slug]` published | dacÄƒ indexing + page not noindex | `/p/{slug}` |
| `/compara`, `/salvate` | **noindex** (recomandat) | self or `/` |
| `/dashboard/**`, login, checkout | **noindex** | â€” |
| Apex Autobear | index (platform brand) | www |

Sitemap: homepage, vehicles available, published CMS â€” **fÄƒrÄƒ** query URLs.

---

## 8. Acceptance criteria (globale)

- Zero leak tenant A â†” B (RLS + Host tests)
- Owner-only writes
- FÄƒrÄƒ PII Ã®n dataLayer
- FÄƒrÄƒ script marketing fÄƒrÄƒ consent (dupÄƒ Phase 5)
- VIN niciodatÄƒ Ã®n metadata/schema
- DocumentaÈ›ie evenimente + settings

---

## 9. Open questions â€” rezolvate (2026-10-15)

1. **Nav:** âœ… OpÈ›iunea A â€” Marketing top-level (Phase 3)
2. **Custom scripts:** âœ… NU Ã®n v1 â€” doar IDs + verification tags
3. **Consent:** âœ… First-party banner
4. **Cine vede IDs:** âœ… Owner-only
5. **compara/salvate:** âœ… noindex forÈ›at (Phase 2)
6. **Order:** âœ… Consent Ã®nainte de Tracking live
7. **Apex Autobear:** â³ tracking platformÄƒ â€” mai tÃ¢rziu / separat (implicit)
8. **Migrare UI SEO:** â³ dual-link Ã®n Phase 3 (PreferinÈ›e pÄƒstreazÄƒ form SEO pÃ¢nÄƒ la Mutual Marketing â†’ SEO)

---

## 10. Validation strategy (per fazÄƒ)

| Check | CÃ¢nd |
|-------|------|
| `pnpm --filter @auto-platform/web typecheck` | fiecare fazÄƒ |
| `pnpm --filter @auto-platform/web test` (scope) | fiecare fazÄƒ cu logicÄƒ |
| `pnpm db:test` | fiecare migrare |
| Build web | Ã®nainte de a considera faza â€ždoneâ€ |
| Smoke Host A/B | metadata, robots, sitemap, scripts |
| Permissions | owner vs member vs anon |
| Consent | denied â†’ no network to GTM/pixels (DevTools) |

URL-uri tipice: `https://{slug}.autobear.ro/`, `/vehicles/...`, `/p/...`, `/robots.txt`, `/sitemap.xml`, `/dashboard/settings/marketing/...`.

---

## 11. DiferenÈ›a â€žsettings UIâ€ vs infrastructurÄƒ

| Settings UI only (evitat) | InfrastructurÄƒ produs (È›intÄƒ) |
|---------------------------|-------------------------------|
| CÃ¢mpuri Ã®n DB fÄƒrÄƒ loader public | SECURITY DEFINER + Host resolve |
| Script lipit Ã®n layout | ScriptLoader + consent + env |
| Evenimente ad-hoc | Taxonomy documentatÄƒ + helpers |
| SEO copy Ã®n UI | Templates + sitemap/robots/JSON-LD testabile |

---

## 12. Riscuri majore

| Risc | Mitigare |
|------|----------|
| XSS via custom scripts | GTM-only v1 sau allowlist strictÄƒ |
| Index bloat filtre | noindex query (deja) |
| Legal CMP greÈ™it | Copy editabil + disclaimer; consult legal separat |
| Performance | Lazy load tags dupÄƒ consent; un singur GTM |
| Scope infinit | Faze mici; nu CAPI/Merchant Ã®n v1 |

---

## 13. Next step

**AÈ™tept aprobarea ta** pe:
1. Ordinea fazelor (2â†’3â†’5â†’4â†’6â†’7â†’8 recomandat)
2. RÄƒspunsurile la Open questions Â§9
3. Confirmarea: **fÄƒrÄƒ cod** pÃ¢nÄƒ spui explicit â€žÃ®ncepe Phase 2â€

DupÄƒ aprobare: implementare pas cu pas, cu raport + teste la fiecare fazÄƒ â€” fÄƒrÄƒ commit/push/deploy fÄƒrÄƒ acord.
