# Etapa 7 — Media și galerie foto

**Status:** 7A + 7B + 7C implementate local

## Decizii v1

| Decizie | Valoare |
|---------|---------|
| Cover | `sort_order = 0` (manual reorder / „Setează principală”) |
| Ștergere | Hard delete Storage + DB |
| Limite | max 20 imagini · 5 MB · JPEG/PNG/WebP |
| Upload | Signed upload URL (staff) + confirm server-side |
| Public | Bucket privat · signed download URL (~1h) după gate `available` |
| Publish gate | Pozele **nu** sunt obligatorii pentru `available` |
| Arhivă/draft | Fișiere păstrate; publicul nu primește URL-uri |

## 7A — Storage + contract server

- SQL bucket/policies: [`packages/db/supabase/vehicle-media-storage.sql`](../../packages/db/supabase/vehicle-media-storage.sql)
- Path obiect: `{tenantId}/{vehicleId}/{mediaId}.{ext}`
- Helpers: `apps/web/src/lib/media/*`, `storage-server.ts`
- Env: `NEXT_PUBLIC_MEDIA_BUCKET`, **`SUPABASE_SERVICE_ROLE_KEY` (server-only)** — mint signed upload + **batch** `createSignedUrls` pentru download (dashboard + storefront) după gate app; mutațiile DB rămân pe `withTenantContext`
- Preview dashboard: semnare download tot via admin (staff JWT eșuează Storage SELECT RLS → „Preview indisponibil”)
- Detaliu public: galerie interactivă (thumbnails clickabile, prev/next, cover selectat implicit)

## 7B — Dashboard

- Secțiune **Galerie foto** pe `/dashboard/vehicles/[id]`
- Upload multiplu, reorder, cover, alt text, delete
- Viewer read-only

## 7C — Storefront

- Catalog: `coverImage` (signed URL)
- Detaliu: galerie ordonată
- DTO public fără `storage_path`, fără id media brut

## Verificare

```bash
pnpm lint
pnpm typecheck
pnpm db:test
pnpm --filter @auto-platform/web test
pnpm --filter @auto-platform/web build
```

## Manual

1. Rulează SQL Storage în Supabase (bucket privat).
2. ACME staff: upload 2–3 poze, reorder, set cover.
3. ACME public `golf-8-acme`: vezi cover + galerie când `available`.
4. Draft: fără imagini publice.
5. DevTools: fără `storage_path` / VIN în JSON pagină.
