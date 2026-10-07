# Handoff — Etapa 15: Audit performanță

## Meta
- Data: 8 octombrie 2026
- Workspace: `C:\Users\Wolf\dev\aplicatie-masini`
- Branch: `master`
- Ultimul commit: `0664db2` — *Let stock tabs scroll away; flush results toolbar to first card.*
- Status: finalizată (formalizare; fără modificări de cod în această etapă)
- Documente citite:
  - `docs/handoffs/README.md`
  - `docs/PERFORMANCE_AUDIT_2026-10-08.md` (raport detaliat — **nu rescris, nu mutat**)
  - `HANDOFF_Functionalitati.md`
  - `docs/architecture.md`, `docs/security.md`, `docs/auth-tenancy.md` (context)

## Obiectiv

Închiderea formală a auditului de performanță: baseline măsurat, concluzii, limitări și plan aprobat pentru Etapa 16. Raportul detaliat rămâne în `docs/PERFORMANCE_AUDIT_2026-10-08.md`.

## Scope aprobat

- Rezumatul măsurătorilor și cauzelor din raportul existent.
- Documentarea limitărilor (ce nu s-a putut măsura).
- Planul aprobat pentru Etapa 16 (Wave 1 + Wave 2; Wave 3 blocată până după re-măsurare).
- Fără modificări de cod, DB, RLS, Git sau deploy în Etapa 15.

## Ce nu intră în scope

- Optimizări de performanță (Etapa 16).
- Rescrierea sau mutarea `PERFORMANCE_AUDIT_2026-10-08.md`.
- Lighthouse / Web Vitals complete (nu au fost rulate în auditul inițial).
- Dashboard autentificat, cold start Vercel, profil SQL.

## Stare înainte

Storefront Template 1 pe cale SSR `force-dynamic`, fără cache HTML; catalog/detaliu cu TTFB ~1 s+ în production local; Compară/Salvate ~0,2 s (fără listă inventar).

## Analiză și decizii

### Baseline măsurat (production local, Host tenant ACME)

| Rută | TTFB (aprox.) | Note |
|------|---------------|------|
| Catalog `/` | **~1,0–1,6 s** | warm #1 ~1646 ms; avg după warm ~1057 ms; HTML ~90 KB |
| Detaliu `/vehicles/[slug]` | **~1,4 s** | avg ~1414 ms; HTML ~72 KB |
| `/compara` | **~0,2 s** | ~217 ms |
| `/salvate` | **~0,2 s** | ~217 ms |

Header tipic HTML: `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`.

### Cauze confirmate (din cod + măsurători)

1. `force-dynamic` pe catalog/detaliu (+ Compară/Salvate) — HTML recalculat la fiecare request.
2. Roundtrip-uri DB secvențiale (tenant, count+list, re-resolve ID după slug pentru cover, media) + semnare Storage la fiecare SSR.
3. Middleware Auth (`getUser`) pe aproape toate rutele non-static.
4. Storefront cu `<img>` simplu, fără `next/image` / priority LCP.
5. Hidratare client pe catalog (filtre, sheets, compare, scroll-collapse).

### Ce nu s-a putut măsura

Lighthouse/Web Vitals, DEV vs PROD numeric pe același Host, dashboard auth, preview teme cu membership, profil SQL per query, cold start Vercel, HAR imagini, React Profiler.

### Plan aprobat pentru Etapa 16

- **Wave 1:** `cache()` pe resolve tenant; cover fără re-fetch slug→id + query doar cover; select slim catalog; atribute `loading`/`decoding`/`fetchPriority` pe imagini.
- **Wave 2:** `next/image` (signed URLs, remotePatterns stricte); dynamic import drawer/quick sheets; GUC batch **doar dacă e demonstrabil sigur** (altfel documentat, fără implementare).
- **Wave 3 (blocată):** cache HTML/data, restrângere middleware Auth — decizie după re-măsurare Wave 1+2.

## Implementare
- Fișiere create: `docs/handoffs/15-performance-audit.md` (acest fișier)
- Fișiere modificate: niciunul (aplicație / DB / env)
- Fișiere șterse: N/A
- Migrări: N/A
- RLS / securitate: neschimbate
- Environment variables: N/A

## Comportament rezultat

Nicio schimbare de runtime. Auditul rămâne documentație; Etapa 16 poate începe pe baza acestui handoff + raportul detaliat.

## Verificări
- Comenzi rulate: N/A (formalizare documentară; măsurătorile sunt cele din raportul 8 oct)
- Rezultate: N/A
- Teste adăugate / modificate: N/A
- Verificare manuală: N/A

## Securitate multi-tenant

Auditul nu a modificat Host-tenancy, RLS, FORCE RLS, `service_role`, DTO public sau auth. Confirmare din raport: fără dezactivare RLS / fără ocolire tenancy pentru viteză.

## Riscuri și limitări

- Baseline-ul e **local production**, nu Vercel Hobby (cold start / latență rețea pot fi mai rele).
- Fără Lighthouse — LCP/INP rămân estimate.
- Wave 3 (cache) poate conflictă cu cerința de stoc „instant” după rezervare.

## Ce nu a fost implementat

Orice optimizare de cod — rezervată Etapei 16.

## Următorul pas recomandat

Etapa **16 — Optimizare performanță** (Wave 1 + Wave 2), apoi re-măsurare TTFB și decizie pe Wave 3.

## Reguli pentru agentul următor

- Nu rescrie / muta `docs/PERFORMANCE_AUDIT_2026-10-08.md`.
- Respectă `docs/handoffs/README.md`.
- Wave 3 rămâne blocată până după măsurători post Wave 1+2.
- Fără commit/push/deploy fără cerere explicită; fără secrete în output.
