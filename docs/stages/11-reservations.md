# Etapa 11 — Rezervări

**Status:** 11A–11C **FINALIZATE** local

## Decizii confirmate

- Staff only: `owner` / `manager` / `sales` creează, anulează, convertesc
- `viewer`: read-only
- TTL: **48h**, calculat exclusiv server-side (fără allowlist UI)
- Create: `active` + `available → reserved` atomic
- Cancel: `active → cancelled`; `reserved → available` numai dacă încă `reserved`
- Expire lazy: `active → expired`; `reserved → available` numai dacă încă `reserved`
- Convert: `active → converted` + `reserved → sold` atomic
- Fără reactivare: expired / cancelled / converted nu revin la `active`
- Storefront public: strict `available` only
- După convert: `sold` dispare din catalog; rămâne în dashboard + istoric rezervări; `/vehicles/[slug]` public = **404**
- Pagina publică „vândut” / redirect SEO = **post-E11**
- Job `reservation.expire`: **neactivat**; fără cron/queue/polling

## Tranziții rezervare

| Din | În | Trigger |
|-----|-----|---------|
| — | `active` | create (staff) |
| `active` | `cancelled` | cancel |
| `active` | `expired` | lazy expiry |
| `active` | `converted` | convert |

## Sincronizare vehicul

| Eveniment | Vehicul |
|-----------|---------|
| create | `available → reserved` |
| cancel / expire | `reserved → available` (condițional) |
| convert | `reserved → sold` |

## Constrângeri DB (existente, neschimbate)

- Partial unique: o singură rezervare `active` per `vehicle_id`
- Unique: `(tenant_id, idempotency_key)`
- RLS: select member; insert/update staff owner/manager/sales
- Conflict create: eroare domeniu neutră / replay idempotent fără al doilea audit

## Lazy expiry

- Helper: `expireStaleReservations` (în TX `withTenantContext`)
- **Listă** `/dashboard/reservations`: batch `limit: 50` înainte de SELECT
- **Detaliu** / create / vehicle manage: țintit pe `reservationId` sau `vehicleId`
- Idempotent: update condițional `status = active` → fără audit/mutații la apel repetat
- Nu eliberează niciodată vehicule `sold`
- **Înainte de volume mari / producție:** necesită job/cron real (sau activare `reservation.expire`) — v1 e doar lazy on access

## Dashboard

| Rută | Rol |
|------|-----|
| `/dashboard/reservations` | listă + filtre Toate/Active/Expirate/Anulate/Convertite |
| `/dashboard/reservations/[reservationId]` | detaliu + cancel/convert (active + staff) |
| `/dashboard/vehicles/[id]` | CTA create dacă `available` + staff; reserved → „Vehicul rezervat.” + link gestionare; sold → „Vehicul vândut.” |

Sort listă: active pe `expiresAt` ASC, apoi `createdAt` DESC.

## Revalidare

`revalidateAfterReservationMutation`: dashboard reservations/vehicles + `/` + `/vehicles` layout.

- **Path-only** (ca branding) — **nu** Host-aware pe custom domains / multi-tenant cache.
- Custom domain / Host strategy → **Etapa 12**.
- În dev, fără cache agresiv, efectul e vizibil imediat.

### 11A — Contract server ✅

Module create/cancel/convert/expire + permissions/errors; teste `etapa11a` + `reservations.isolation`.

### 11B — Dashboard UI ✅

Listă/detaliu/CTA/nav/revalidate; teste `etapa11b`.

### 11C — Polish + docs ✅

- Lazy expiry verificat (idempotent; sold intact)
- UI: `Expiră în mai puțin de o oră`; empty CTA vehicule; mesaje status detaliu; panel reserved/sold pe vehicul
- Docs + handoff finale
- Teste `etapa11c-reservations.test.ts`

## Non-goals (Etapa 11)

- Rezervare publică / CTA storefront / formular client
- Legare rezervare → lead / contact client
- Depozit / plată / factură
- Email / notificări noi
- Cron / job queue / activare `reservation.expire`
- Pagina publică sold / redirect SEO
- Restore/archive workflow pentru sold
- Migrări / RLS / indexuri noi / policy profiles
- Commit / push / deploy (fără cerere explicită)

## Verificare

```bash
pnpm --filter @auto-platform/web test
pnpm --filter @auto-platform/web lint
pnpm typecheck
pnpm --filter @auto-platform/web build
pnpm db:test
```
