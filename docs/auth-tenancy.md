# Auth & multi-tenancy (Etapa 3)

## Session

- Supabase Auth via `@supabase/ssr`
- Cookies refreshed in `apps/web/src/middleware.ts`
- Server identity: `supabase.auth.getUser()` (not cookie-only `getSession`)
- Public env only: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Never** `service_role` on user request paths

## Tenant from host

- Root: `NEXT_PUBLIC_ROOT_DOMAIN` (dev: `localhost:3000`)
- `acme.localhost:3000` → slug `acme`
- `beta.localhost:3000` → slug `beta`
- Apex `localhost:3000` → no tenant
- Invalid host / unknown slug → `TenantResolutionError`
- Client `tenant_id` is **not** trusted

## Server utilities

| Helper | Location |
|--------|----------|
| `getCurrentUser` | `apps/web/src/lib/auth/get-current-user.ts` |
| `getCurrentTenant` / `requireCurrentTenant` | `apps/web/src/lib/tenant/get-current-tenant.ts` |
| `requireMembership` | `apps/web/src/lib/auth/require-membership.ts` |
| `requireRole` / `requireMinimumRole` | `apps/web/src/lib/auth/require-role.ts` |
| `assertTenantAccess` | `apps/web/src/lib/auth/assert-tenant-access.ts` (+ `@auto-platform/core`) |

## Chain

```text
Auth cookie → profiles.id = auth.users.id
  → Host → tenants.slug
  → memberships(profile, tenant, role)
  → withTenantContext({ profileId, tenantId }) for business queries
```

## Route protection

- Middleware: session refresh; `/dashboard/*` without user → `/login?auth=required` (same Host)
- Authenticated user on `/login` → `/dashboard` (same Host; never apex)
- `dashboard/layout.tsx`: membership re-check (Node/server)
- Login UI: `/login` (4A); dashboard shell (4B); vehicles list/create (4C); edit/status/archive (4D); mobile polish + security tests (4E) — Etapa 4 finalizată

## RLS

Etapa 2 RLS + FORCE RLS remain active. App checks complement RLS; they do not replace it.
