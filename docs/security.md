# Security

## Threat model (MVP foundation)

Primary risk: **cross-tenant data leakage** (wrong query, missing filter, misconfigured RLS, `service_role` misuse).

## Controls

### 1. Authentication

- Supabase Auth for dealer staff sessions via `@supabase/ssr` cookies (Etapa 3).
- Server identity: `getUser()`; membership/role checked in app code.
- Profiles table keyed by auth user id (`profiles.id → auth.users.id`).
- Auth UI / full dashboard = later stages.

### 2. Authorization / tenancy (defense in depth)

1. **PostgreSQL RLS** — enabled + forced on business tables (`0001_rls_and_helpers.sql`).
2. **Session GUCs** — `app.profile_id`, `app.tenant_id` via `withTenantContext()`.
3. **Server asserts** — `assertSameTenant()`; never trust client `tenant_id`.
4. **Membership helpers** — `app.has_tenant_access()`, `app.has_tenant_role()`.

### 3. RLS policies (summary)

| Table | Read | Write |
|-------|------|-------|
| tenants | members; **public storefront** when no profile and status `active`\|`trial` (`0002`) | update: owner |
| profiles | own row | insert/update own |
| memberships | own or tenant members | insert/update: owner/manager; delete: owner |
| vehicles | members; public `available` when no profile | staff owner/manager/sales |
| vehicle_media | members; public for available vehicles | staff |
| leads | members | insert: public-to-active-tenant or member; update: staff |
| reservations | members | staff |
| audit_logs | members | insert members; **no update/delete policies** |
| tenant_features | members | owner |

Public storefront notes (Etapa 5):

- Policy `tenants_select_public_storefront` is SELECT-only; suspended tenants stay invisible to anon.
- App exposes a whitelist DTO (`name`, `slug`, validated `primaryColor`) — never raw branding / id / plan / domain.
- Lead insert RLS unchanged: public insert only when tenant status = `active`.
- Prefer a runtime DB role **without** `BYPASSRLS`. Never use `service_role` on user paths.

### 4. Secrets

| Secret | Where | Rule |
|--------|-------|------|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser OK | Subject to RLS |
| `DATABASE_URL` | Server only | Prefer non-BYPASSRLS role at runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only, rare | **Forbidden** on user request paths |

### 5. Audit

`writeAuditLog()` in `packages/db/src/audit.ts` — insert-only, requires `tenantId`.

### 6. Testing

`packages/db/src/__tests__/cross-tenant.isolation.test.ts`:

- Offline: `assertSameTenant` always runs
- Online (needs `DATABASE_URL` + migrated DB): seed two tenants, verify isolation + one active reservation

`packages/db/src/__tests__/public-storefront.isolation.test.ts` (Etapa 5):

- Anon can read `active`/`trial` tenants; `suspended` hidden when RLS enforced
- Staff membership SELECT unaffected; FORCE RLS still on
