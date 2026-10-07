# Handoff — Funcționalități

**Data:** 8 octombrie 2026  
**Workspace:** `C:\Users\Wolf\dev\aplicatie-masini`  
**Demo live:** https://auto-platform-beige.vercel.app  
**Detalii tehnice / istoric:** [`HANDOFF_Status_Actual_Aplicatie_Auto_Platform.md`](./HANDOFF_Status_Actual_Aplicatie_Auto_Platform.md) · [`HANDOFF_ARHITECTURA.md`](./HANDOFF_ARHITECTURA.md)

Acest document răspunde la: **ce funcționează azi** și **ce merită făcut în continuare**.

---

## 0. Verdict scurt

Platforma este un **MVP multi-tenant funcțional** pentru dealeri auto:

- Storefront public **Template 1** (catalog, filtre, detaliu, Compară, Salvate, contact).  
- Dashboard: inventar, lead-uri, rezervări, setări + teme.  
- Izolare pe **Host** + RLS; demo pe Vercel Hobby (`HOBBY_DEMO_*`).

Etapele **1–11** sunt făcute; **12** = demo Hobby pe Vercel; **13** (template-uri extra) neîncepută.

---

## 1. Ce avem acum (inventar)

Legendă: **DONE** = utilizabil · **PARTIAL** = UI/logică incompletă · **MISSING** = nu există

### 1.1 Storefront public (Template 1)

| Funcționalitate | Status | Note |
|-----------------|--------|------|
| Header sticky (brand + Sună / WhatsApp) | DONE | Accent din culoarea dealerului |
| Nav desktop: Mașini / Salvate / Compară | DONE | |
| Bottom nav mobil | DONE | Acasă · Mașini · Salvate · Compară · Sună |
| Footer contacte | DONE | |
| Sticky contact pe detaliu | DONE | Mesaj / Sună / WhatsApp |
| Scroll chrome filtre (lift → pin → opacity) | DONE | „În stoc” iese din pin; toolbar lipit de primul card |
| Frame ~1200px + design Template 1 | DONE | |

**Catalog `/`**

| Funcționalitate | Status | Note |
|-----------------|--------|------|
| Listă vehicule disponibile (paginare 12) | DONE | Fără VIN în public |
| Filtre URL shareable | DONE | q, brand, preț, an, km, combustibil, cutie, caroserie, sort |
| Quick sheets (Brand / Caroserie / Combustibil / Preț / An) | DONE | Vezi rezultate, X, backdrop |
| Drawer „Toate filtrele” | DONE | Accordion pe mobil |
| Chips filtre active + reset | DONE | |
| Sort + paginare | DONE | |
| Imagini cover (Storage semnat) | PARTIAL | Unele carduri fără imagine |
| Tabs „În stoc / Urmează în stoc” | PARTIAL | UI; „Urmează” fără inventar real |
| SEO: `/` index; filtre → noindex | DONE | |

**Detaliu `/vehicles/[slug]`**

| Funcționalitate | Status | Note |
|-----------------|--------|------|
| Galerie media | DONE | |
| Preț, TVA, km, an | DONE | |
| 01 Finanțare · 02 Tehnic+Dotări · 03 Descriere | DONE | |
| Estimare rată (APR, luni, slider) | DONE | Calcul local |
| „Aplică acum” finanțare | PARTIAL | Dialog UI; **nu** salvează în DB |
| Share | DONE | Web Share / clipboard |
| Salvează / Compară pe detaliu | DONE | |
| Carusel „Alte alternative” | DONE | |
| Formular lead („Sunt interesat”) | PARTIAL | Anti-spam OK; pe Hobby poate fi oprit |

**Compară & Salvate**

| Funcționalitate | Status | Note |
|-----------------|--------|------|
| `/salvate` | DONE | localStorage pe dispozitiv |
| `/compara` (2–4 mașini) | DONE | localStorage |
| Bară floating Compară pe catalog | DONE | Poate fi ascunsă (X) |

**Contact / leads publice**

| Funcționalitate | Status | Note |
|-----------------|--------|------|
| Lead în DB | DONE | Când nu e dezactivat |
| Anti-spam (honeypot, cooldown, rate-limit) | PARTIAL | Rate-limit in-memory |
| Email către dealer | PARTIAL | Doar noop/log — fără Resend real |

---

### 1.2 Dashboard dealer

| Funcționalitate | Status | Note |
|-----------------|--------|------|
| Login / logout (Supabase Auth) | DONE | |
| Guard `/dashboard/*` | DONE | |
| Membership + rol pe Host | DONE | |
| Nav: Prezentare · Vehicule · Rezervări · Lead-uri · Setări | DONE | |
| Prezentare (welcome) | PARTIAL | Fără KPI / analytics |
| Inventar: listă, create, edit pe secțiuni | DONE | VIN doar staff |
| Status vehicul + arhivare | DONE | Gate publish → available |
| Upload galerie Storage | DONE | Bucket privat, URL semnate |
| Lead-uri: listă, detaliu, status, assign | DONE | |
| Notificare email lead nou | MISSING | |
| Rezervări: create / cancel / convert | DONE | TTL 48h |
| Expirare rezervări automată | PARTIAL | Lazy la access; fără cron |
| Profil utilizator | DONE | |
| Echipă | PARTIAL | Listă read-only; invite/roluri disabled |
| Detalii firmă | PARTIAL | Doar nume comercial |
| Teme (Template 1 apply + preview) | DONE | Template 2 = preview only |
| CMS Pagini | MISSING | Placeholder |
| Preferințe SEO / favicon / analytics | PARTIAL | Branding/contact OK; restul inactiv |

---

### 1.3 Platformă & infra

| Funcționalitate | Status | Note |
|-----------------|--------|------|
| Tenant din Host (fail-closed) | DONE | Fără `?tenant_id=` |
| Subdomenii locale (`acme.localhost`) | DONE | |
| Apex landing | DONE | |
| Hobby demo pe Vercel | DONE | Un singur slug pe apex |
| RLS + assert-uri server | DONE | |
| Supabase + Drizzle + migrări | DONE | |
| Seed ACME / Beta | PARTIAL | Posibile date demo „murdare” |
| Jobs / cron | PARTIAL | Client in-memory = noop |
| Vitest | DONE | Fără CI GitHub |
| Deploy auto din `master` | DONE | |
| Custom domains automate | MISSING | |
| Billing / Stripe | MISSING | |
| App Expo | MISSING | Skeleton |
| Cache HTML catalog | MISSING | `force-dynamic` |
| `next/image` pe storefront | MISSING | `<img>` simplu |

**Explicit out of scope (neconstruit):** marketplace sync, VIN decoder, leasing real, trade-in, AI, K8s.

---

## 2. Ce recomand să facem mai departe

Prioritizare orientată pe **valoare pentru dealer** și **calitate demo**, nu pe „nice to have”.

### P0 — Rapid, impact mare (1–2 săptămâni)

1. **Email real la lead nou** (Resend / similar) — fără asta, dashboard-ul de lead-uri e „mort” operațional.  
2. **Curățare seed / inventar demo** — fără „Test Reservation”, cover-uri consistente pe toate cardurile.  
3. **„Urmează în stoc”** — ori flux real (status dedicat + filtrare), ori ascundere până e gata (evită UI mincinos).  
4. **Finanțare „Aplică acum”** — ori creează lead tip `finance`, ori scoate CTA-ul până persistă.  
5. **Stabilizare scroll chrome pe mobil** — deja îmbunătățit; smoke test pe Safari/Chrome real după fiecare polish.

### P1 — Produs dealer (2–4 săptămâni)

6. **Cron expirare rezervări** — job periodic, nu doar lazy.  
7. **Invite echipă + schimbare rol** — altfel „Echipă” rămâne decor.  
8. **Detalii firmă complete** — telefon, adresă, program (ceea ce alimentează footer / sticky).  
9. **Rate-limit lead multi-instance** — Redis / Upstash (Hobby/Pro).  
10. **Preferințe SEO de bază** — title/description pe tenant (chiar fără CMS full).

### P2 — Diferențiere & scală

11. **CMS Pagini** (Despre / Contact static) — Etapa „Pagini” din setări.  
12. **Template 2 activ** (Etapa 13) — după ce Template 1 e „înghețat” ca baseline.  
13. **Perf storefront** — cache selectiv, `next/image`, reducere TTFB (vezi audit perf).  
14. **Custom domain** — mapare Host → tenant (coloana există).  
15. **CI GitHub** — typecheck + test pe PR.  
16. **Compară / Salvate în cont** (opțional) — azi e doar localStorage.

### P3 — Mai târziu

17. Billing / Stripe, Expo, VIN decoder, leasing real, marketplace sync.

---

## 3. Ce e gata de arătat acum (pitch)

- Catalog filtrabil Autovit-like pe mobil + desktop.  
- Detaliu cu finanțare estimată, tehnic, alternative, share.  
- Compară + Salvate pe dispozitiv.  
- Dashboard inventar / lead-uri / rezervări.  
- Schimbare temă Template 1 + preview.  
- Demo public: `auto-platform-beige.vercel.app`.

---

## 4. Reguli scurte pentru următorul agent

- **Tenant = Host only** (și gates `HOBBY_DEMO_*` pe Vercel).  
- **Nu** afișa `.env` / secrete.  
- Commit / push / deploy **doar la cerere explicită**.  
- Pe storefront: păstrează limbajul vizual Template 1; polish mobil > feature noi fără contract.  
- Status detaliat vechi: `HANDOFF_Status_Actual_Aplicatie_Auto_Platform.md`.

---

## 5. Checklist smoke (5 minute)

- [ ] `/` — listă + filtre + „Vezi rezultate”  
- [ ] Scroll: „În stoc” urcă; filtrele pin + fade; „6 mașini” lipit de primul card  
- [ ] Click pe mașină → detaliu  
- [ ] Salvate / Compară din bottom nav  
- [ ] Lead pe detaliu (dacă nu e Hobby-disabled)  
- [ ] Dashboard: login → vehicule / lead-uri  

---

*Document creat pentru handoff de produs — „funcționalități”, 8 oct 2026.*
