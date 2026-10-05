# Database

## Provider

Supabase PostgreSQL is the current database. Access from the app goes through **Drizzle ORM** in `packages/db`.

## Schema (implemented — Etapa 2)

| Table | `tenant_id` | Notes |
|-------|-------------|-------|
| `tenants` | n/a (root) | slug unique, plan, status, branding jsonb, custom_domain |
| `profiles` | via memberships | `id` matches Supabase Auth user when `auth.users` exists |
| `memberships` | NOT NULL | role: owner/manager/sales/viewer; unique(tenant, profile) |
| `vehicles` | NOT NULL | status machine; unique(tenant, slug) |
| `vehicle_media` | NOT NULL | storage_path agnostic (Supabase Storage now) |
| `leads` | NOT NULL | vehicle_id nullable |
| `reservations` | NOT NULL | partial unique: one `active` per vehicle |
| `audit_logs` | NOT NULL | append-only |
| `tenant_features` | NOT NULL | unique(tenant, feature_key) |

Enums: `tenant_status`, `tenant_plan`, `membership_role`, `vehicle_status`, `lead_status`, `reservation_status`, `vehicle_media_type`.

## Migrations

Located in `packages/db/drizzle/`:

1. `0000_common_professor_monster.sql` — tables, enums, indexes, FKs
2. `0001_rls_and_helpers.sql` — `app.*` helpers, RLS enable/force, policies, optional `profiles → auth.users` FK
3. `0002_tenants_public_storefront_select.sql` — anon SELECT on `tenants` for storefront (`active`\|`trial` only)
4. `0003_dashing_ikaris.sql` — Etapa 6A vehicle inventory attributes (enums + nullable columns + indexes; legacy `specs.fuel` map)

**Supabase Storage (Etapa 7, manual):** [`packages/db/supabase/vehicle-media-storage.sql`](../packages/db/supabase/vehicle-media-storage.sql) — bucket privat `vehicle-media` + policies staff.

Migrations are the **source of truth** for RLS policies. Drizzle TS schema documents tables/columns; policy comments live on `schema/tenants.ts`.

```bash
pnpm db:generate   # after schema TS changes
pnpm db:migrate    # requires DATABASE_URL or DATABASE_URL_MIGRATIONS
pnpm db:seed       # requires DATABASE_URL + migrated DB
pnpm db:test       # offline guards always; DB tests skip without DATABASE_URL
```

## Hard rules

- Never accept arbitrary `tenant_id` from the client.
- Runtime should prefer a DB role **without** `BYPASSRLS`.
- Never use `service_role` on user request paths.
- One active reservation per vehicle enforced by unique partial index.

## Session GUCs (RLS)

Set by `withTenantContext` / `setTenantSession` in `packages/db/src/rls.ts`:

- `app.profile_id`
- `app.tenant_id`
