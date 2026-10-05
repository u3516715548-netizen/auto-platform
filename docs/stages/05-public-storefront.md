# Etapa 5 — Public storefront

**Status: FINALIZATĂ** (implementare locală; fără commit/push/deploy)

## Scop

Storefront public **mobile-first** per tenant (rezolvat din Host):

- catalog `/` — doar vehicule `available`
- detaliu `/vehicles/[slug]`
- formular lead „Sunt interesat” (doar tenant `active`)
- SEO de bază (title/description)
- Fără rezervări, media UI, VIN, dashboard changes

## Decizii produs (aprobate)

| Tenant status | Catalog | Lead form |
|---------------|---------|-----------|
| `active` | da | da |
| `trial` | da | nu (UI disabled + action deny) |
| `suspended` / invalid host | 404/deny | — |

- Tenant din Host (`x-forwarded-host` / `host`); niciodată `tenant_id` din client
- DTO public whitelist: `name`, `slug`, `branding.primaryColor` (hex validat)
- `status` doar server-side (`leadsEnabled`); nu în UI brut
- Nu se expun: `tenant.id`, branding JSON brut, plan, custom domain, config interne
- Lead: honeypot `company` + cooldown cookie 5 min; RLS leads neschimbat (insert doar pe tenant `active`)

## Migrare RLS (sursă de adevăr)

`packages/db/drizzle/0002_tenants_public_storefront_select.sql`:

```sql
CREATE POLICY tenants_select_public_storefront
ON public.tenants
FOR SELECT
USING (
  app.current_profile_id() IS NULL
  AND status IN ('active', 'trial')
);
```

- `ENABLE RLS` + `FORCE RLS` pe `tenants` **păstrate** (din `0001`)
- Doar `FOR SELECT`; fără INSERT/UPDATE/DELETE public
- Fără `service_role` / BYPASSRLS / ocolire RLS
- Politica staff `tenants_select_member` neschimbată

Schema TS: comentarii pe `packages/db/src/schema/tenants.ts` (politicile rămân în SQL).
Documentat și în [`../database.md`](../database.md) + [`../security.md`](../security.md).

## Implementare (fișiere cheie)

| Zonă | Path |
|------|------|
| Resolve tenant public | `apps/web/src/lib/storefront/resolve-public-tenant.ts` |
| Vehicles DTO | `apps/web/src/lib/storefront/public-vehicles.ts` |
| Lead action | `apps/web/src/lib/storefront/create-public-lead.ts` |
| UI | `apps/web/src/app/page.tsx`, `vehicles/[slug]/page.tsx`, `components/storefront/*` |
| Tipuri Zod | `packages/types` — `primaryColorHexSchema`, `createPublicLeadInputSchema` |

Apex (`localhost`) → landing platformă. Host tenant → catalog. Suspended → `notFound()`.

## Teste

### DB — `packages/db/src/__tests__/public-storefront.isolation.test.ts`

- anon: `active`/`trial` SELECT permis; `suspended` interzis (RLS) sau deny app dacă rolul are BYPASSRLS
- politică `tenants_select_public_storefront` există, cmd SELECT
- FORCE RLS încă activ pe `tenants`; staff membership SELECT neatins
- catalog ACME/BETA izolat; doar `available` public; slug străin/inexistent/reserved → gol (404)
- lead insert anon atribuit server-side tenant+vehicle; trial insert respins de RLS leads existent

### Web — `apps/web/src/lib/storefront/__tests__/public-storefront.test.ts`

- host invalid → deny; DTO whitelist (fără id/plan/domain/branding/vin/status)
- formular leads: active da / trial nu
- Zod, honeypot, cooldown 5 min; anti-smuggling `tenant_id`/`vehicle_id`
- online: `loadPublicTenantBySlug` + `listPublicVehicles` / `getPublicVehicleBySlug` izolare ACME/BETA

## Explicit în afara scope-ului

- media/galerie, rezervări, VIN, custom domain automation
- dashboard / CRUD admin (Etapa 4)
- mobile Expo, billing, marketplace
- commit / push / deploy fără cerere

## Criterii de acceptare

1. Host → tenant corect; suspended/invalid → 404
2. Catalog fără scurgere cross-tenant; doar `available`
3. Lead pe tenant Host + vehicle slug pagină; trial fără lead
4. Mobile-first CTA-uri; SEO title/description
5. Lint / typecheck / `db:test` / `web test` / build OK; handoff actualizat

## Checklist test manual

1. `acme.localhost:3000/` — catalog ACME; fără vehicule BETA
2. `beta.localhost:3000/` — catalog BETA; fără vehicule ACME
3. Detaliu `golf-8-acme` pe ACME OK; același slug pe BETA → 404
4. Vehicul `reserved`/inexistent → 404
5. Lead pe ACME (active) OK; pe tenant `trial` formular indisponibil
6. Host invalid / tenant inexistent / suspended → 404
7. DevTools: răspuns fără `tenant.id`, plan, domain, branding brut, VIN
