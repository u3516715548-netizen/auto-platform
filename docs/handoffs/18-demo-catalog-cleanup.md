# Handoff — Etapa 18: Curățare catalog demo

## Meta
- Data: 8 octombrie 2026
- Workspace: `C:\Users\Wolf\dev\aplicatie-masini`
- Branch: `master`
- Ultimul commit: `0664db2` — *Let stock tabs scroll away; flush results toolbar to first card.*
- Status: finalizată
- Documente citite:
  - `docs/handoffs/README.md`
  - `docs/handoffs/15-performance-audit.md`
  - `docs/handoffs/16-performance-optimization.md`
  - `HANDOFF_Functionalitati.md`
  - `HANDOFF_Status_Actual_Aplicatie_Auto_Platform.md`
  - `docs/database.md`
  - `docs/security.md`
  - `docs/auth-tenancy.md`

## Obiectiv

Curățarea catalogului public ACME: fără Test Reservation, fără Golf fără cover, doar showcase cu cover-uri; teardown teste ca poluarea să nu revină după `pnpm db:test`; script idempotent de cleanup.

## Scope aprobat

- Public ACME: doar `koenigsegg-ccx`, `audi-rs6`, `maserati-granturismo` (`available` + cover).
- Arhivare soft: Golf `golf-8-acme` + Test Reservation (`available` matching make/model / `e11a-res-%` / `%test-reservation%`).
- Seed: Golf rămâne rând, dar `archived`; showcase `available`; fără seed Test Reservation.
- Teardown în suitele care creează vehicule de test `available`.
- Script `pnpm db:clean-acme-catalog` (idempotent, ACME-only).
- Actualizare teste online care așteptau Golf public.

## Ce nu intră în scope

- Arhivare în masă a draft-urilor de test / istoric isolation.
- Hard-delete, migrări, RLS / FORCE RLS, env, tenancy, Storage deletes.
- Upload cover Golf; preview Template 1 demo; Wave 3; Etapa 17 email.
- Commit / push / deploy.

## Stare înainte

Catalog public ACME: 7 `available` — 3× Test Reservation (fără cover, primul card), 3 showcase cu cover, Golf fără cover. ~120 draft/archived de test lăsate intenționat.

## Analiză și decizii

1. Soft-archive (`status = archived`) — reversibil, fără Storage wipe.
2. Golf fără cover → arhivat (reactivare când există imagine).
3. Test Reservation vine din teste (`e11a-res-*`), nu din seed → teardown + cleanup obligatorii.
4. Cleanup doar pe ACME; Beta neschimbat.
5. Scriptul doar schimbă status; asigură showcase `available`; loghează slug-uri, fără UUID.

## Implementare
- Fișiere create:
  - `packages/db/src/demo/clean-acme-public-catalog.ts`
  - `packages/db/scripts/clean-acme-public-catalog.mts`
  - `packages/db/src/__tests__/clean-acme-public-catalog.test.ts`
  - `docs/handoffs/18-demo-catalog-cleanup.md` (acest fișier)
- Fișiere modificate:
  - `packages/db/src/seed/dev-tenants.ts` — Golf `archived`; showcase forțat `available`; comentarii
  - `packages/db/scripts/replace-test-reservation-catalog.mts` — wrapper deprecated → același cleanup
  - `packages/db/package.json` — script `clean-acme-catalog`
  - `package.json` — `db:clean-acme-catalog`
  - `packages/db/src/__tests__/reservations.isolation.test.ts` — `afterAll` archive + `cleanAcmePublicCatalog`
  - `packages/db/src/__tests__/vehicle-publish-gate.test.ts`
  - `packages/db/src/__tests__/public-storefront.isolation.test.ts`
  - `apps/web/src/lib/storefront/__tests__/catalog-query-online.test.ts`
  - `apps/web/src/lib/storefront/__tests__/public-storefront.test.ts`
  - `apps/web/src/lib/storefront/__tests__/public-gallery-online.test.ts`
- Fișiere șterse: N/A
- Migrări: N/A
- RLS / securitate: neschimbate
- Environment variables: N/A (scriptul citește `DATABASE_URL` existent; nu se tipăresc valori)

### Comandă cleanup

```text
pnpm db:clean-acme-catalog
```

(sau `pnpm --filter @auto-platform/db clean-acme-catalog`)

## Comportament rezultat

- Catalog ACME public: 3 vehicule showcase, toate cu cover; primul card (newest) are cover.
- `golf-8-acme` și Test Reservation: `archived` → detaliu public 404.
- După `pnpm db:test`, teardown lasă catalogul fără Test Reservation `available`; cleanup confirmă 3 available.
- Preview Template 1 (`DEMO_VEHICLES` / `/demo-vehicles/`) neschimbat.
- Beta: `focus-beta` intact; fără leak ACME showcase.

## Verificări
- Comenzi rulate:
  - `pnpm db:test` — 36 passed (×2, inclusiv după implementare)
  - `pnpm typecheck` — OK
  - `pnpm --filter @auto-platform/web test` — 237 passed
  - `pnpm --filter @auto-platform/web build` — OK
  - `pnpm db:clean-acme-catalog` — available: audi-rs6, koenigsegg-ccx, maserati-granturismo
- Rezultate HTTP (Host `acme.localhost:3000` → :3000):
  - Catalog: showcase prezent; Golf / Test Reservation / `e11a-res-` absente
  - `/vehicles/golf-8-acme` → 404; `/vehicles/koenigsegg-ccx` → 200
  - Beta catalog: `focus-beta` prezent; fără koenigsegg / golf ACME
- Teste adăugate / modificate: cleanup online + așteptări showcase în loc de Golf public; teardown rezervări
- Verificare manuală: stringul „Imagine indisponibilă” poate apărea în payload RSC ca prop de fallback pe `StorefrontMediaImage`, nu ca card fără media; cover-urile showcase sunt semnate via `next/image`

## Securitate multi-tenant

- Cleanup filtrează strict `tenants.slug = acme`.
- Fără hard-delete, fără Storage remove, fără schimbări RLS.
- Host-only tenancy neschimbat; DTO public neschimbat.
- Script offline folosește doar `DATABASE_URL` (nu service_role; nu pe path user).

## Riscuri și limitări

- Draft-urile de test rămân în DB (intenționat).
- Golf poate fi reactivat manual ulterior cu cover.
- Dacă apar alte tipare de vehicule `available` de test în afara criteriilor aprobate, cleanup-ul nu le atinge — extinde criteriile într-o etapă viitoare.
- Suitele online pot crea temporar poluare în timpul rulării paralele; teardown + cleanup post-test o elimină.

## Ce nu a fost implementat

- Cover Golf / reactivare publică.
- Curățare draft-uri de test în masă.
- Etapa 17 (email lead).
- Commit / push / deploy.

## Următorul pas recomandat

Etapa **17** — `17-lead-email-delivery` (email real la lead nou), conform roadmap `docs/handoffs/README.md` (sărită intenționat când s-a cerut Etapa 18).

## Reguli pentru agentul următor

- Nu reactiva Golf fără cover.
- După seed / teste DB pe mediu demo, rulează `pnpm db:clean-acme-catalog` dacă catalogul trebuie „curat” imediat.
- Nu atinge Beta / RLS / Storage în follow-up-uri de catalog demo.
- Nu face commit/push/deploy fără cerere explicită.
- Nu expune secrete, UUID-uri sau signed URL-uri complete în handoff-uri.
