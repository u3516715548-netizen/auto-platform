# Etapa 4 — Auth UI + Vehicles + Dashboard

**Status: FINALIZATĂ** — subetapele **4A–4E** complete

## Corecții aprobate

- Login tenant-aware: `acme.localhost:3000/login` → `acme.localhost:3000/dashboard` (niciodată apex)
- Editare vehicule: `/dashboard/vehicles/[id]`
- Schema/migrări/RLS/FK neschimbate; `tenantId` doar din host + membership
- Mutații: roluri `owner` | `manager` | `sales`; `viewer` read-only; audit pe create/update/status/archive
- Mobile-first pe toate paginile

## 4A–4D — FINALIZATE

- **4A** Login/logout tenant-aware
- **4B** Dashboard shell responsive
- **4C** Listă + create vehicule
- **4D** Edit `/dashboard/vehicles/[id]`, status, arhivare logică + audit

Detalii în istoricul acestui document / handoff.

## 4E — Polish mobile + teste securitate — FINALIZATĂ

Implementat:

- Polish UI mobile-first: `min-w-0` / `overflow-x-hidden`, padding ~320px, touch targets `min-h-11`, focus vizibil (teal), contrast îmbunătățit
- Shell, nav, listă, tab-uri Active/Arhivate, create/edit/status/archive — layout fără overflow orizontal
- `FeedbackBanner` comun pentru succes/eroare/info; empty/loading clarificate
- Hint reactivare pe status arhivat; CTA full-width pe mobil
- Teste securitate 4E: roluri mutate vs viewer, `tenant_id` smuggle, path-uri relative, Active exclude arhivate + reactivare
- DB: archive list exclusion + reactivation cross-tenant safe

### Fișiere 4E (principale)

| Fișier | Rol |
|--------|-----|
| `apps/web/src/app/globals.css` | Overflow-x, focus-visible, fără dark auto |
| `apps/web/src/components/ui/feedback-banner.tsx` | Banner succes/eroare/info |
| `apps/web/src/lib/ui/form-styles.ts` | Stiluri select/CTA touch-friendly |
| `apps/web/src/components/dashboard/*` | Shell/nav polish |
| `apps/web/src/components/vehicles/*` | Listă/formulare polish |
| `apps/web/src/lib/vehicles/__tests__/security.test.ts` | Suite securitate 4E |
| `packages/db/src/__tests__/vehicle-archive-list.test.ts` | Archive/reactivate online |
| `packages/ui/src/{button,input}.tsx` | Focus ring / contrast |

### Comenzi rulate (4E) — toate OK

```bash
pnpm lint                                 # OK
pnpm typecheck                            # OK
pnpm db:test                              # OK — 12/12
pnpm --filter @auto-platform/web test     # OK — 37/37
pnpm --filter @auto-platform/web build    # OK
```

Warning existent Next.js: convenția `middleware` → `proxy` (nu blochează; în afara scope 4E).

## Explicit în afara scope-ului (Etapa 4)

Upload, galerie, marketplace, VIN, leasing, trade-in, billing, Expo, custom domains, storefront public, commit/push/deploy fără cerere.
