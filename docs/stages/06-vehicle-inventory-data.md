# Etapa 6 — Date vehicul complete și validare

**Status: 6A + 6B + 6C FINALIZATE**

## Scop

Completarea modelului de inventar auto (piața RO) cu atribute profesionale, validare la publicare și (în 6C) afișare storefront — fără galerie, search UI sau template-uri.

## Decizii aprobate

| Decizie | Valoare |
|---------|---------|
| VIN | doar staff; niciodată în DTO/SEO/JSON-LD/URL |
| Create | scurt → `draft`: make, model, year, mileage, price |
| Gate `available` | + fuel, transmission, bodyType, condition, powerHp, description, **vatRegime** |
| Limbă | UI / mesaje / metadata generate în română |
| Monedă | EUR fix (fără selector/conversie în E6) |
| Km | exclusiv kilometri; formatare `ro-RO` |
| Features | allowlist + etichete RO; Zod respinge chei necunoscute |
| Culori | text liber validat (fără HTML) |
| Accident | `none \| cosmetic \| minor \| major \| unknown` |
| Garanție | `warrantyMonths` + `warrantyNotes` |
| Prima înmatriculare | `firstRegistrationYear` + `firstRegistrationMonth` (pot ≠ an model) |

## 6A — Model de date (finalizată)

Migrare: `packages/db/drizzle/0003_dashing_ikaris.sql`

- Enums + coloane nullable + indexuri + map `specs.fuel` → `fuel`
- Zod publish schema, features allowlist, `formatPriceEurRo` / `formatMileageKmRo`
- Seed: available complete + `draft-incomplet-acme`
- **RLS neschimbat**

## 6B — Formulare admin + gate (finalizată)

| Item | Detaliu |
|------|---------|
| Create | scurt, `draft`, EUR forțat server-side, fără selector monedă |
| Edit | secțiuni RO: bază, tehnic, preț/fiscal, stare/istoric, descriere, dotări |
| VIN | doar pe edit dashboard |
| Gate | `updateVehicleStatus` → `available` via `assessVehiclePublishReady` |
| Listă | preț/km `ro-RO`; fără VIN |
| Teste | unit 6B + online publish-gate pe `draft-incomplet-acme` |
| Verificare | `lint` · `typecheck` · `db:test` 28/28 · `web test` 66/66 · `web build` OK |

## 6C — Storefront public extins (finalizată)

| Item | Detaliu |
|------|---------|
| DTO | whitelist Etapa 6C; fără `id`, `tenantId`, `vin`, `status`, `specs`, audit |
| Catalog `/` | carduri mobile-first; km/preț `ro-RO`; sumar tehnic |
| Detaliu `/vehicles/[slug]` | secțiuni RO; descriere plain text; dotări allowlist |
| SEO | title `Marcă Model An – Preț € \| Dealer`; description RO trunchiată |
| Lead | formular Etapa 5 neschimbat; vehicul rezolvat server-side |
| Teste | `etapa6c-public-dto` + storefront online (draft exclus) |
| Verificare | `lint` · `typecheck` · `db:test` 28/28 · `web test` 72/72 · `web build` OK |

## Checklist test manual (6C)

1. **ACME** catalog: vehicule `available`; fără `draft-incomplet-acme`
2. **ACME** detaliu `golf-8-acme`: secțiuni tehnice, dotări RO, descriere text simplu
3. **BETA** catalog izolat; slug ACME pe host BETA → 404
4. View source / DevTools: fără VIN, fără UUID vehicul, fără `tenantId`
5. Lead „Sunt interesat” pe ACME active funcționează; trial fără lead
6. Metadata pagină detaliu: title cu preț EUR și nume dealer

## Reguli permanente

- Tenant din Host + membership; fără `tenant_id` din client
- FORCE RLS activ; fără `service_role` pe path-uri user
- Fără commit/push/deploy fără cerere

## Checklist test manual (6B)

1. ACME: creează ciornă scurtă → apare ca draft
2. ACME: editează inventar complet + salvează → status available OK
3. ACME: `draft-incomplet-acme` → available eșuează cu listă câmpuri
4. BETA: nu poate edita vehicul ACME (404)
5. Viewer: read-only pe edit; mutațiile sunt respinse
6. DevTools: listă dashboard fără VIN; preț afișat `… €`
