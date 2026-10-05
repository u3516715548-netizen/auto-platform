# Etapa 3 — Auth + multi-tenancy web

**Status: FINALIZATĂ**

## Rezumat

Utilitare server pentru Supabase Auth (cookies + `@supabase/ssr`), rezoluție tenant din `Host`, membership/rol, protecție `/dashboard/*`, teste de securitate. Fără dashboard complet, CRUD, storefront, upload, billing.

## Implementat

- `@supabase/supabase-js` + `@supabase/ssr` în `@auto-platform/web`
- Client server (`createSupabaseServerClient`) + browser minim (`createSupabaseBrowserClient`)
- Middleware: refresh sesiune + hint `x-tenant-slug` + redirect neautentificat pe `/dashboard`
- `getCurrentUser`, `getCurrentTenant` / `requireCurrentTenant`
- `requireMembership`, `requireRole` / `requireMinimumRole`, `assertTenantAccess`
- Host: `acme.localhost:3000`, `beta.localhost:3000`, apex `localhost:3000`
- Stub gate `apps/web/src/app/dashboard/*` (nu dashboard produs)
- Docs: [`../auth-tenancy.md`](../auth-tenancy.md)
- Tipuri/erori/roluri în `@auto-platform/core`

## Securitate păstrată

- Fără `service_role` pe path-uri user
- RLS + FORCE RLS neschimbate (fără migrări noi)
- FK `profiles.id → auth.users.id` păstrat
- Tenant din host, nu din `tenant_id` client
- Query business: folosiți `withTenantContext` după membership verificat

## Teste

`pnpm --filter @auto-platform/web test`:

- host `acme` / `beta` / apex / invalid
- `assertTenantAccess` cross-tenant deny
- rol insuficient / ierarhie roluri
- tenant inexistent + membership lipsă (online dacă `DATABASE_URL` e setat)

## Criterii de acceptare

| Criteriu | Status |
|----------|--------|
| Sesiune cookies + `getUser()` | OK |
| Tenant din host | OK |
| Membership / rol server-side | OK |
| RLS + FK Auth păstrate | OK |
| Fără service_role pe user paths | OK |
| Teste securitate | OK |
| lint / typecheck / db:test / build | vezi handoff |

## Explicit neimplementat

Dashboard complet, CRUD vehicule, storefront, upload, mobile, billing, Etapa 4.
