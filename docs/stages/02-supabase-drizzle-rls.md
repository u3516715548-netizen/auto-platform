# Etapa 2 — Supabase + Drizzle + RLS

**Status:** finalizată și validată pe Supabase

## Rezumat

Schema Drizzle, migrări aplicate, RLS + FORCE RLS, seed pe doi tenanți de development, helpers de context/audit, teste de izolare cross-tenant (8/8). Fără Auth UI, fără `@supabase/ssr`, fără dashboard/CRUD/storefront.

## Schema DB (implementată)

| Table | `tenant_id` | Note |
|-------|-------------|------|
| `tenants` | n/a | slug unic, plan, status, branding, custom_domain |
| `profiles` | via memberships | `id` = Supabase Auth user id |
| `memberships` | NOT NULL | rol: owner / manager / sales / viewer |
| `vehicles` | NOT NULL | status machine; unique(tenant, slug) |
| `vehicle_media` | NOT NULL | `storage_path` agnostic |
| `leads` | NOT NULL | `vehicle_id` nullable |
| `reservations` | NOT NULL | o singură rezervare `active` per vehicle |
| `audit_logs` | NOT NULL | append-only |
| `tenant_features` | NOT NULL | unique(tenant, feature_key) |

Enums: `tenant_status`, `tenant_plan`, `membership_role`, `vehicle_status`, `lead_status`, `reservation_status`, `vehicle_media_type`.

Detalii: [`../database.md`](../database.md).

## Migrări aplicate

În `packages/db/drizzle/`:

1. `0000_common_professor_monster.sql` — tabele, enum-uri, indexuri, FK-uri
2. `0001_rls_and_helpers.sql` — helpers `app.*`, RLS enable/force, policies, FK opțional `profiles → auth.users`
3. `0002_tenants_public_storefront_select.sql` — (Etapa 5) SELECT public pe `tenants` pentru `active`\|`trial`

`0000` + `0001` sunt **aplicate** pe proiectul Supabase de development (Etapa 2). `0002` aparține Etapei 5 — vezi [`05-public-storefront.md`](./05-public-storefront.md).

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:test
```

## RLS, FORCE RLS, izolare tenant

- RLS activat + **FORCE** pe tabelele de business
- GUC-uri de sesiune: `app.profile_id`, `app.tenant_id` via `withTenantContext()` / `setTenantSession()`
- Helpers SQL: `app.has_tenant_access()`, `app.has_tenant_role()`
- Assert app: `assertSameTenant()` — nu se încrede în `tenant_id` din client
- Runtime preferă un rol DB **fără** `BYPASSRLS`
- `service_role` **nefolosit** pe path-uri user

Detalii politici: [`../security.md`](../security.md).

## Seed

`packages/db/src/seed/dev-tenants.ts`:

- Citește `SEED_PROFILE_A_ID` și `SEED_PROFILE_B_ID` din env (`apps/web/.env.local`)
- Validează prezența, format UUID și distinctivitatea — **fără a loga valorile**
- Creează tenanții `acme` / `beta`, memberships, date minime pentru teste
- Nu hardcodează UUID-uri
- Respectă FK `profiles.id → auth.users.id`

Placeholders documentate în `.env.example`. **Nu documentați secrete sau UUID-uri reale aici.**

## Teste online

`packages/db/src/__tests__/cross-tenant.isolation.test.ts` — **8/8 passed**:

- izolarea cross-tenant (vehicles + audit)
- o singură rezervare `active` per vehicle
- guards offline (`assertSameTenant`)

## Audit helpers

- `writeAuditLog()` în `packages/db/src/audit.ts` — insert-only, cere `tenantId`
- `audit_logs`: fără politici de update/delete

## Reguli FK către `auth.users`

- FK `profiles.id → auth.users.id` **rămâne**
- Seed-ul folosește doar UUID-uri de useri Auth reali (via env)
- Nu se elimină FK-ul pentru a „debloca” seed-ul
- Nu se dezactivează RLS / FORCE RLS pentru conveniență

## Validare la închiderea etapei

| Check | Result |
|-------|--------|
| `pnpm db:migrate` | OK (2 migrări) |
| `pnpm db:seed` | OK |
| `pnpm db:test` | OK — 8/8 |
| `pnpm lint` / `typecheck` / web build | OK |

## Explicit neimplementat în Etapa 2

Auth UI, `@supabase/ssr`, middleware web, dashboard, CRUD vehicule, storefront, Storage UI, mobile Expo.
