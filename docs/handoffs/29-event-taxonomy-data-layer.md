# Handoff 29 — Event Taxonomy & Data Layer Wiring (Phase 5)

**Data:** 2026-10-16 (Europe/Bucharest)
**Status:** DONE local — fără commit / push / deploy
**Depinde de:** Phase 4 Consent + Tracking Runtime
**Urmează:** Phase 6 Content SEO / Landing (după aprobare owner) — **nu începe automat**

---

## Arhitectură

| Piesă | Locație |
|-------|---------|
| Taxonomy + mapping | `lib/marketing/events-contract.ts` |
| Sanitize (anti-PII) | `lib/marketing/sanitize-event-params.ts` |
| Emitter + destinations | `lib/marketing/emit-marketing-event.ts` |
| Runtime snapshot | `lib/marketing/tracking-runtime-registry.ts` |
| page_view | `StorefrontPageViewTracker` (în `StorefrontMarketingRuntime`) |
| view_item | `StorefrontViewItemTracker` pe PDP |
| view_item_list + search | `CatalogResultsSection` |
| compare / saved | `StorefrontListsProvider` (doar la **add**) |
| generate_lead | `PublicLeadForm` + finance success |
| finance_* | `VehicleFinancePanel` |
| contact_start + click_* sticky | `StickyContactBar` |
| click_* shell | `TrackedContactLink` (header / footer / mobile nav) |

**Nu** pe apex / `saas-shell`. Doar `PublicStorefrontShell`.

---

## Persistare / consent (neschimbat Phase 4)

Cookie host-only `ab_consent`. Emitter: cookie → fallback registry (sincronizat de banner).

---

## Destinații

1. **GTM configurat (`preferGtm`)** → doar `dataLayer.push({ event, ... })`. GTM mapează tag-urile.
2. **Fără GTM + GA4 ID** → `dataLayer` + `gtag('event', …)` (analytics consent).
3. **Meta / TikTok / LinkedIn** → **nu** API direct de evenimente în v1 (risc dubluri / arhitectură murdară). Pixeli se încarcă din Phase 4; evenimentele custom se configurează în GTM.

---

## Naming

- dataLayer / GA4: `page_view`, `view_item`, `generate_lead`, `saved_vehicle`, … (fără prefix `ab_`)
- Namespace: `event_source: "autobear"`
- Motiv: GTM GA4 Event tags pot folosi același Event Name; filtrare pe `event_source` dacă e nevoie.

---

## Ce e live vs absent

**Live:** page_view, view_item_list, view_item, search, compare_add, saved_vehicle, finance_start, finance_submit, contact_start, generate_lead, click_phone, click_whatsapp, click_email.

**Contract, trigger absent:**
- `click_directions` — nu există CTA maps/directions pe storefront
- `reservation_start` / `reservation_submit` — rezervările sunt doar în dashboard

---

## Dedupe

- page_view: o dată per `pathname?search`
- view_item: o dată per slug
- view_item_list / search: cheie pe query + tenant
- generate_lead / finance_submit: o dată per success (ref + dedupeKey)
- compare/saved: doar pe add (nu pe remove)
- clicks: fiecare click (intent real)

---

## Teste

```bash
pnpm --filter @auto-platform/web exec vitest run src/lib/marketing/__tests__/emit-marketing-event.test.ts
pnpm --filter @auto-platform/web typecheck
```

SEO / consent / marketing settings regressions rămân verzi.

---

## Cum verifici manual

1. Accept all pe `{slug}.localhost`
2. `window.dataLayer.filter(x => x.event === 'page_view')`
3. Deschide PDP → `view_item`
4. Salvează / Compară → `saved_vehicle` / `compare_add`
5. Submit lead → `generate_lead` (fără email/telefon în payload)
6. Reject all → nu mai apar evenimente noi în destinații
7. Cu GTM: Tag Assistant; fără GTM + GA4: Network `collect` / gtag

---

## Ce NU e în Phase 5

- Custom arbitrary scripts
- Event API Meta/TikTok/LinkedIn direct
- Offline / CRM conversions
- Reporting dashboard / health checker
- Apex Autobear tracking
- Phase 6 Content SEO

---

## Limitări

- Finance success emite **ambele** `finance_submit` + `generate_lead` (lead_type=finance) — intentional pentru GA4 recommended + custom funnel.
- GTM container trebuie configurat de dealer să asculte aceste event names + Consent Mode.
- `items` array GA4 ecommerce nested nu e trimis (payload flat, fără PII) — suficient pentru v1.
