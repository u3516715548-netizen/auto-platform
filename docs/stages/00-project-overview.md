# Overview — Platformă SaaS „Shopify pentru Auto”

## Obiectiv produs

SaaS B2B2C pentru dealeri auto: fiecare dealer (tenant) are storefront public, dashboard de stoc, lead-uri, rezervări și branding propriu — model tip „Shopify”, adaptat pieței auto.

## Stack aprobat

| Layer | Choice |
|-------|--------|
| Monorepo | Turborepo + pnpm |
| Language | TypeScript strict |
| Web | Next.js App Router (`apps/web`) — storefront + dashboard |
| UI | Tailwind CSS (+ shadcn/ui pe măsură ce e nevoie) |
| DB | Supabase PostgreSQL |
| Auth | Supabase Auth |
| ORM / migrations | Drizzle ORM (`packages/db`) |
| Validation | Zod (`packages/types`) |
| Multi-tenancy | `tenant_id` + PostgreSQL RLS + verificări server |
| Media | Supabase Storage (portabil ulterior) |
| Jobs | Abstraction în `packages/core/jobs` (provider ulterior) |
| Mobile | Expo placeholder (`apps/mobile`) — white-label mai târziu |

## Principii de arhitectură

1. Logica de business rulează server-side (Server Actions / Route Handlers / utilitare server).
2. Browserul nu mutează direct baza de date pe operații de business.
3. Drizzle deține schema, migrările și accesul server la Postgres.
4. Supabase este infrastructură curentă, nu stratul de domeniu al produsului.
5. RLS este obligatoriu, dar insuficient singur — sesiune, membership, rol și tenant se verifică și în cod.
6. `service_role` este interzis pe path-urile de request ale utilizatorilor.
7. Operațiile sensibile se auditează.
8. Path-urile multi-tenant au teste explicite de izolare cross-tenant.
9. `tenant_id` din client nu este sursă de adevăr.

## Roadmap etapizat

| Etapă | Document | Status |
|-------|----------|--------|
| 0 — Overview | [00-project-overview.md](./00-project-overview.md) | activ |
| 1 — Monorepo foundation | [01-monorepo-foundation.md](./01-monorepo-foundation.md) | **finalizată** |
| 2 — Supabase + Drizzle + RLS | [02-supabase-drizzle-rls.md](./02-supabase-drizzle-rls.md) | **finalizată** |
| 3 — Auth + multi-tenancy web | [03-auth-multi-tenancy.md](./03-auth-multi-tenancy.md) | **finalizată** |
| 4 — Vehicles + dashboard | [04-vehicles-dashboard.md](./04-vehicles-dashboard.md) | **finalizată** |
| 5 — Public storefront | [05-public-storefront.md](./05-public-storefront.md) | **finalizată** |
| 6 — Vehicle inventory data | [06-vehicle-inventory-data.md](./06-vehicle-inventory-data.md) | **Finalizată (6A–6C)** |
| 7 — Vehicle media / gallery | [07-vehicle-media.md](./07-vehicle-media.md) | **Finalizată local (7A–7C)** |
| 8 — Public catalog search | [08-public-catalog-search.md](./08-public-catalog-search.md) | **Finalizată local (8A–8C)** |
| 9 — Design system + Template 1 | [09-design-system-template.md](./09-design-system-template.md) | **Finalizată local (9A–9C)** |
| 10 — Public leads | [10-public-leads.md](./10-public-leads.md) | **Finalizată local (10A–10D)** |
| 11 — Reservations | [11-reservations.md](./11-reservations.md) | **Finalizată local (11A–11C)** |
| 12 — Hardening / deploy | [12-hardening-deploy.md](./12-hardening-deploy.md) | **pregătire Hobby demo (fără deploy)** |
| 13 — Extra storefront templates | — | ulterioară |

## Scope exclus (momentan)

- Mobile white-label (Expo/EAS complete)
- Marketplace sync, VIN decoder, leasing calculator, trade-in
- Stripe / billing
- Automatizare custom domains
- Microservicii, Kubernetes
- Feature-uri AI
- Commit / push / deploy fără cerere explicită a owner-ului

## Documentație aferentă

- Handoff scurt: [`HANDOFF_ARHITECTURA.md`](../../HANDOFF_ARHITECTURA.md)
- Detalii tehnice transversale: [`../architecture.md`](../architecture.md), [`../database.md`](../database.md), [`../security.md`](../security.md)
