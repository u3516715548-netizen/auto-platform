# Audit de performanță — Auto Platform

**Data:** 8 octombrie 2026  
**Scop:** de ce aplicația pare lentă + plan de optimizare pe măsurători  
**Constrângeri respectate:** fără modificări de cod, fără commit/push/deploy, fără schimbări env/DB/RLS/tenancy, fără afișare secrete.

---

## 1. Ce am putut măsura efectiv

### 1.1 Build de producție

```text
pnpm --filter @auto-platform/web build
```

- **Reușit** (~8–9 s pe mașina locală).  
- Next.js **16.3.8** (Turbopack la build).  
- Avertisment: convenția `middleware` e depreciată → viitor `proxy`.  
- **Toate rutele storefront/dashboard sunt `ƒ` Dynamic** (server-rendered on demand).  
- Singura rută statică din listă: `/_not-found` (`○`).

### 1.2 Server production local

- Portul **3000** era deja ocupat (probabil `next dev`) → am pornit **`next start` pe 3001** (fără a opri procese existente).  
- Tenant ACME: `Host: acme.localhost:3000` către `http://127.0.0.1:3001/` (root domain local tipic include `:3000`).

### 1.3 TTFB (time to first byte) — HTML SSR

| Rută | HTTP | TTFB (aprox.) | Observații |
|------|------|---------------|------------|
| Catalog `/` (warm #1) | 200 | **~1646 ms** | primul request după start |
| Catalog `/` (3× după warm) | 200 | **avg ~1057 ms** (min ~1048) | HTML ~**90 KB** |
| Detaliu `/vehicles/[slug]` (3×) | 200 | **avg ~1414 ms** | HTML ~**72 KB** |
| `/compara` | 200 | **~217 ms** | fără listă vehicule din DB |
| `/salvate` | 200 | **~217 ms** | idem, localStorage pe client |

**Interpretare simplă:** o secundă+ înainte să înceapă HTML-ul pe catalog/detaliu = senzație de „încărcare lentă”, **înainte** de JS/imagini din browser.

Header tipic pe răspuns (observat):  
`Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` → browserul/CDN nu reutilizează HTML-ul.

### 1.4 Bundle (fișiere `.next/static/chunks`, top după mărime)

| Fișier (hash) | ~KB |
|---------------|-----|
| chunk mare #1 | ~254 |
| chunk mare #2 | ~224 |
| chunk #3 | ~132 |
| chunk #4 | ~110 |
| CSS | ~64 |

Nu e un „megabundle” absurd, dar pe catalog se încarcă totuși **multe** chunk-uri client (filtre, compare, context liste, etc.).

### 1.5 Analiză statică din cod (confirmată)

Vezi §4–§5. Surse: `public-vehicles.ts`, `public-vehicle-media.ts`, `page.tsx`, `vehicles/[slug]/page.tsx`, `middleware.ts`, componente storefront.

---

## 2. Ce nu am putut măsura (și de ce)

| Măsurătoare | De ce lipsește |
|-------------|----------------|
| Lighthouse / Web Vitals (LCP, CLS, INP) în browser | Nu am rulat Chrome DevTools/Lighthouse pe sesiune; DNS PowerShell pentru `acme.localhost` a eșuat uneori |
| Comparație DEV vs PROD pe același Host | Request-urile către `:3000` (dev) **s-au blocat / timeout** în timpul măsurătorii; nu am oprit forțat serverul de pe 3000 |
| Dashboard autentificat | Necesită login; nu am folosit credențiale / session |
| Preview Template 1 interactiv (teme) | Necesită auth membership pe rutele dashboard |
| Profil SQL (timpi per query) | Ar necesita instrumentare DB / logging; interzis să atingem DB/config |
| Cost Vercel Hobby / cold start edge | Nu e măsurabil doar local |
| Network waterfall imagini signed URL | Nu am capturat HAR |
| Re-render count React (Profiler) | Nu am rulat React Profiler |

---

## 3. Production local vs Development local

| Afirmație | Status |
|-----------|--------|
| Build production **compilează** și pornește | **Da** (port 3001) |
| Production local e **mai rapid** decât `next dev` | **Neconfirmat numeric** (dev pe 3000 nu a răspuns la timp în test) |
| Ipoteză rezonabilă | Dev cu Turbopack e de obicei **mai lent / mai greu** la primul load și HMR; senzația de „lent” pe Vercel/prod vine totuși din **SSR dinamic + DB + signed URLs**, nu doar din `next dev` |

**Concluzie prag:** chiar și în **production mode**, catalogul stă ~**1,0–1,6 s** TTFB. Problema principală **nu** e doar „rulezi pe dev”.

---

## 4. Top 5 cauze probabile (după impact)

1. **SSR mereu dinamic (`force-dynamic`) + fără cache HTML** pe catalog/detaliu → fiecare vizită recalculează pagina pe server.  
2. **Multe roundtrip-uri DB secvențiale** (tenant de 2× pe metadata+page, GUC clear repetat, count+list, re-resolve ID după slug, media) + **semnare Storage**.  
3. **Middleware Auth (`getUser`) pe rute publice** → cost rețea Supabase Auth la fiecare navigare.  
4. **Imagini cu `<img>` simplu**, fără `next/image` / sizes / priority LCP → LCP și transfer pe mobil suferă.  
5. **Hidratare client grea pe catalog** (drawer filtre, quick sheets, compare bar, scroll-collapse, context localStorage) + animații/blur pe chrome.

---

## 5. Confirmate vs ipoteze

### Confirmate (din cod + măsurători)

| # | Găsire |
|---|--------|
| C1 | `export const dynamic = "force-dynamic"` pe `/`, `/vehicles/[slug]`, `/compara`, `/salvate` |
| C2 | Răspuns HTML cu `no-store` / no-cache |
| C3 | Catalog TTFB ~1 s+; detaliu ~1,4 s în production local |
| C4 | Compară/Salvate ~0,2 s (fără listă inventar) — contrast puternic |
| C5 | Tenant + catalog: muncă duplicată metadata vs page; GUC clear înainte de multe operații |
| C6 | Cover: după listă există deja `id`, dar se reîncarcă ID-uri după slug; media încarcă **toate** imaginile vehiculelor din pagină, se semnează doar cover |
| C7 | Semnare Storage batched (`createSignedUrls`), TTL ~3600 s — OK ca API, dar **la fiecare SSR** |
| C8 | Storefront folosește `<img>`, nu `next/image` |
| C9 | Middleware apelează Auth pe aproape toate rutele non-static |
| C10 | Multe componente `"use client"` pe calea catalog/detaliu |
| C11 | Preview temă **demo data** = fără DB; `/storefront-template-preview` = **cu DB** |
| C12 | Build: **zero** pagini storefront pre-randate static |

### Ipoteze (plauzibile, nemăsurate fin)

| # | Ipoteză |
|---|---------|
| H1 | GUC `set_config` pe connection pool domină latența |
| H2 | `backdrop-blur-md` pe header/nav → jank pe telefoane slabe |
| H3 | `CatalogScrollCollapse` `setState` pe scroll → muncă React inutilă |
| H4 | Carusel alternative autoplay 2 s → baterie/CPU pe detaliu |
| H5 | Cold start Vercel Hobby + latență Supabase remote → și mai lent pe internet decât local |
| H6 | Select catalog prea „lat” (description, features…) pentru carduri |

---

## 6. Optimizări pe categorii

### Rapide, risc mic

| Optimizare | Fișiere | Beneficiu | Risc | Storefront activ | Preview |
|------------|---------|-----------|------|------------------|---------|
| `loading="lazy"` + `decoding="async"` pe cover-uri non-LCP; `fetchPriority="high"` pe primul cover | `public-vehicle-list.tsx`, gallery | LCP / bandwidth | mic | da | demo folosește path-uri locale — impact mic |
| Nu încărca toate media rows pentru cover — doar `sortOrder` minim / DISTINCT ON | `public-vehicle-media.ts` | mai puțin IO DB | mic–mediu (teste media) | da | nu (demo) |
| Reutilizează `id` din listă; elimină `resolveVehicleIdsBySlugs` | `public-vehicle-media.ts`, DTO | −1 query/pagină | mic | da | nu |
| Deduplică resolve tenant între `generateMetadata` și page (React `cache()`) | `resolve-public-tenant.ts`, pages | −câteva roundtrip-uri | mic | da | preview auth neschimbat |
| Reduce `will-change` / throttle scroll-collapse (rAF) | `catalog-scroll-collapse.tsx` | jank scroll | mic | da | nu |
| `prefers-reduced-motion` deja există pentru drawer — păstrează | `globals.css` | a11y/CPU | — | da | — |

### Medii

| Optimizare | Fișiere | Beneficiu | Risc | Storefront | Preview |
|------------|---------|-----------|------|------------|---------|
| Introdu `next/image` + sizes pentru cover/gallery | list, gallery, compare bar | LCP, CLS, bytes | mediu (signed URL + domain config) | da | demo: path locale ușor |
| Skip / scurtează Auth pe rute 100% publice (matcher mai strict sau getSession vs getUser unde e safe) | `middleware.ts`, `lib/supabase/middleware.ts` | −latență Auth | **mediu–mare** (securitate session) — **fără a slăbi RLS** | da | dashboard neschimbat dacă e exclus |
| Select „slim” pentru catalog (fără description/features full) | `public-vehicles.ts` | payload + serializare | mic–mediu | da | nu |
| Batch GUC clear o singură dată per request | `clear-public-session.ts` + call sites | −roundtrip-uri | mediu (pooling) | da | puțin |
| Dynamic import pentru quick sheets / drawer greu | `catalog-filter-drawer.tsx` | JS inițial | mic | da | demo drawer similar |

### Necesită arhitectură / atenție

| Optimizare | Fișiere | Beneficiu | Risc | Storefront | Preview |
|------------|---------|-----------|------|------------|---------|
| Cache scurt (ex. 10–30 s) sau tag cache pe catalog, invalidare la publish/status | pages + vehicle mutations | TTFB mult mai bun | **mare** dacă rezervările trebuie instant — conflict cu `force-dynamic` intentional | da | demo ok |
| Edge/CDN cache pentru HTML public + signed URL strategy (sau public CDN pe media) | media + hosting | TTFB global | mare (securitate bucket privat) | da | nu |
| Split Server Components: detaliu mai puțin `"use client"` | `public-vehicle-detail.tsx` | TTI | mediu (refactor) | da | aliniere demo |
| Background job / CDN pentru thumbnails resize | storage pipeline | imagini mici | mare (infra) | da | — |

**Nu recomand:** dezactivare RLS, `service_role` pe path public, sau ocolirea tenancy Host pentru viteză.

---

## 7. Plan în pași mici (fără implementare acum)

### Pasul A — Baseline (1–2 h)
1. Lighthouse mobil pe `acme.localhost` (dev sau prod :3001) + salvează HAR.  
2. Notează LCP element (probabil cover).  
3. Opțional: log temporar de durată pe `listPublicVehiclesForCatalog` / `attachPublicCoverImages` (într-o sesiune viitoare de implementare).

### Pasul B — Quick wins server (0,5–1 zi)
1. Deduplică tenant resolve (`cache()`).  
2. Elimină re-fetch ID by slug; slim media query pentru covers.  
3. Re-măsoară TTFB catalog — țintă: sub **600–700 ms** local.

### Pascul C — Imagini (1 zi)
1. `next/image` + remotePatterns pentru host signed URL.  
2. Priority doar pe primul card / hero gallery.  
3. Re-măsoară LCP.

### Pasul D — Client catalog (0,5–1 zi)
1. Code-split drawer/sheets.  
2. Throttle scroll-collapse.  
3. Verifică INP la deschiderea filtrelor.

### Pasul E — Cache (decizie produs)
1. Decide SLA: „stocul trebuie vizibil în ≤ Xs după rezervare?”  
2. Dacă 15–30 s e OK → cache scurt + `revalidatePath` existent la mutări.  
3. Dacă trebuie instant → păstrează dynamic, optimizează doar DB/Auth/media.

### Pasul F — Middleware (cu review securitate)
1. Documentează ce trebuie neapărat `getUser` pe public.  
2. Restrânge matcher / cost doar dacă review-ul de securitate aprobă.

---

## 8. Impact pe suprafețe

| Suprafață | De ce e lentă acum |
|-----------|-------------------|
| **Storefront Template 1 (activ)** | SSR dinamic + DB + signed URL + client greu + imagini neoptimizate |
| **Preview demo (teme)** | Ar trebui să fie **rapid** (date in-memory); dacă e lent, cauza e JS/CSS UI, nu DB |
| **`/storefront-template-preview`** | Lovește DB + auth — alt profil de cost |
| **Compară / Salvate** | HTML relativ rapid; lent doar dacă clientul hidratează greu sau descarcă cover-uri după |
| **Vercel Hobby** | Aceeași arhitectură + latență rețea Supabase + posibil cold start (**ipoteză**) |

---

## 9. Confirmări finale

- **Nu am modificat** codul aplicației pentru acest audit.  
- **Nu am făcut** commit, push sau deploy.  
- **Nu am modificat** `.env.local`, variabile de mediu, Supabase, RLS, tenancy sau baza de date.  
- **Nu am afișat** secrete, chei, token-uri, UUID-uri reale sau conținut env.  
- Am rulat doar: `pnpm --filter @auto-platform/web build`, `next start` pe **3001**, și request-uri HTTP de măsurare.  
- Există deja modificări UX **locale necommitate** în working tree (filtre, scroll-collapse, handoff) — **nu le-am atins** în această sarcină.

---

## 10. Rezumat pe o frază

Aplicația pare lentă în principal pentru că **fiecare vizită pe Mașini/Detaliu reconstruiește pagina pe server (~1–1,5 s TTFB măsurat local în production)**, cu **multe query-uri + semnare media + Auth în middleware**, iar pe client **imaginile și hidratarea filtrelor/compare** adaugă cost după ce HTML-ul a sosit — nu pentru că Template 1 „e greșit”, ci pentru că **calea de date e dinamică și necache-uită din design**.
