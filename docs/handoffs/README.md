# Handoffs pe etape — proces standard

Acest director definește **procesul obligatoriu** pentru etapele noi ale auto-platform (de la **14** în sus).

Documentele din rădăcina repo-ului (`HANDOFF_*.md`), din `docs/` (architecture, database, security, auth-tenancy) și din `docs/stages/` rămân **surse istorice de context**. **Nu le rescrie, nu le înlocui și nu le scurta** în cadrul unei etape. Handoff-urile noi se adaugă **doar aici**, ca fișiere separate.

---

## 1. Scop

- Un contract unic: citire → audit/plan → implementare îngustă → verificări → handoff nou.
- Separare clară între etape: **nu** se amestecă scope-ul.
- Trasabilitate: fiecare etapă terminată lasă un document `docs/handoffs/NN-….md`.

---

## 2. Surse de adevăr (context, nu de rescris)

Înainte de orice etapă, agentul citește (după relevanță):

| Document | Rol |
|----------|-----|
| [`HANDOFF_Status_Actual_Aplicatie_Auto_Platform.md`](../../HANDOFF_Status_Actual_Aplicatie_Auto_Platform.md) | Status consolidat produs / gaps |
| [`HANDOFF_Functionalitati.md`](../../HANDOFF_Functionalitati.md) | Inventar DONE/PARTIAL/MISSING + priorități |
| [`docs/architecture.md`](../architecture.md) | Stack, monorepo, principii |
| [`docs/database.md`](../database.md) | Schema, migrări, seed |
| [`docs/security.md`](../security.md) | RLS, threat model, reguli |
| [`docs/auth-tenancy.md`](../auth-tenancy.md) | Host → tenant, membership, guards |
| [`docs/stages/`](../stages/) | Specificații etape **0–12** (istoric) |
| [`docs/PERFORMANCE_AUDIT_2026-10-08.md`](../PERFORMANCE_AUDIT_2026-10-08.md) | Raport detaliat audit perf (input Etapa 15; **nu se rescrie / mută**) |
| Handoff-urile din **acest** director (`14+`) | Ce s-a făcut în etapele noi |

`HANDOFF_ARHITECTURA.md` poate fi citit ca pointer scurt, dar **nu se actualizează** ca parte a acestui proces de handoff-uri pe etape (decât dacă o etapă viitoare o cere explicit).

Etapele vechi din `docs/stages/` (**00–12**, eventual 13) **nu** se mută aici. Aici încep **etapele noi 14–25**.

---

## 3. Ordinea etapelor viitoare

Ordinea de mai jos este **obligatorie** ca roadmap. Nu se sare peste o etapă fără decizie explicită a utilizatorului.

| # | Slug | Titlu | Intenție |
|---|------|-------|----------|
| 14 | `14-template-1-stabilization` | Stabilizare Template 1 | Stabilizare UX/comportament Template 1 (mobil + desktop) |
| 15 | `15-performance-audit` | Audit performanță | Formalizare audit (măsurători + concluzii); **fără** optimizări majore de cod |
| 16 | `16-performance-optimization` | Optimizare performanță | Optimizări pe baza auditului / handoff-ului Etapei 15 |
| 17 | `17-lead-email-delivery` | Email real pentru lead-uri | Livrare email real la lead nou |
| 18 | `18-demo-catalog-cleanup` | Curățare catalog demo | Curățare catalog/seed demo (date + cover-uri) |
| 19 | `19-finance-leads` | Lead-uri de finanțare | Persistare lead-uri din fluxul „Aplică acum” / finanțare |
| 20 | `20-reservation-expiry-jobs` | Cron pentru rezervări | Expirare rezervări prin job/cron (nu doar lazy) |
| 21 | `21-team-invitations-roles` | Invitații + roluri echipă | Invite echipă + gestionare roluri |
| 22 | `22-company-details` | Detalii complete firmă | Detalii firmă (contact, adresă, program etc.) |
| 23 | `23-pages-cms-seo` | CMS Pagini + SEO | Pagini CMS + SEO de bază pe tenant |
| 24 | `24-template-2` | Template 2 | Template 2 activ (nu doar preview) |
| 25 | `25-mobile-expo` | Mobile Expo | Aplicație / shell Expo |

### Notă — Etapa 15 (Audit performanță)

Raportul detaliat **inițial** există deja în:

```text
docs/PERFORMANCE_AUDIT_2026-10-08.md
```

- Acest fișier **nu se rescrie** și **nu se mută**.
- Etapa 15 **nu** înseamnă „refă auditul de la zero” dacă raportul rămâne valid; înseamnă **închiderea formală** a etapei.
- La finalizarea formală a Etapei 15 se creează **separat**:

```text
docs/handoffs/15-performance-audit.md
```

Handoff-ul Etapei 15 trebuie să **rezume**:

1. măsurătorile relevante din raportul existent (și orice re-verificare punctuală, dacă e cerută);
2. concluziile;
3. limitările auditului;
4. **planul aprobat pentru Etapa 16** (optimizare).

Etapa **16** consumă handoff-ul 15 (+ raportul detaliat ca anexă de context), nu rescrie `PERFORMANCE_AUDIT_2026-10-08.md`.

**Reguli despre fișiere:**

- **Nu** crea în avans fișiere goale pentru 14–25.
- Fișierul `NN-….md` se creează **la finalul** etapei respective (după implementare + verificări), sau la start doar dacă utilizatorul cere explicit un handoff de plan — default: **la final**.
- O etapă se începe **doar** când utilizatorul o cere explicit (ex. „începe Etapa 14”).

---

## 4. Contractul obligatoriu al unei etape

Fiecare etapă nouă urmează **exact** această secvență:

1. **Citește** documentația și handoff-urile relevante (secțiunea 2 + handoff-ul etapei anterioare, dacă există).
2. **Audit + plan** concret pentru etapa curentă (fișiere, riscuri, verificări).
3. **Raportează planul** înainte de modificări, dacă etapa are **risc tehnic semnificativ** (RLS, migrări, auth, multi-tenant, email, jobs, breaking UX storefront).
4. **Implementează numai** scopul etapei curente.
5. **Nu introduce** funcționalități din etape viitoare.
6. **Rulează** verificările relevante (typecheck / test / build / smoke manual — după ce cere etapa).
7. **Creează** un handoff nou, separat, la final (`docs/handoffs/NN-nume-etapa.md`).
8. **Nu rescrie** handoff-uri existente (nici pe cele din rădăcină, nici pe cele din acest director).
9. **Nu** face commit, push sau deploy fără cerere explicită.
10. **Nu** expune secrete (`.env.local`, `DATABASE_URL`, token-uri, chei).

Dacă utilizatorul cere o abatere de la scope, agentul **oprește** și confirmă înainte să continue.

---

## 5. Numele documentelor de handoff

Format obligatoriu:

```text
docs/handoffs/NN-nume-etapa.md
```

Exemple:

```text
docs/handoffs/14-template-1-stabilization.md
docs/handoffs/15-performance-audit.md
docs/handoffs/17-lead-email-delivery.md
```

- `NN` = număr pe două cifre, aliniat la tabelul din §3.
- `nume-etapa` = slug kebab-case din același tabel.
- Un singur handoff final pe etapă (nu „v2” care rescrie istoricul; dacă e nevoie de addendum, se anexează o secțiune nouă **în același fișier** doar dacă utilizatorul o cere — preferabil un follow-up etapă nouă).

---

## 6. Template obligatoriu pentru fiecare handoff nou

Copiază structura de mai jos **integral** când creezi `docs/handoffs/NN-….md`. Completează toate secțiunile; dacă o secțiune nu se aplică, scrie explicit `N/A` + motiv.

```md
# Handoff — Etapa NN: [Nume]

## Meta
- Data:
- Workspace:
- Branch:
- Ultimul commit:
- Status:
- Documente citite:

## Obiectiv

## Scope aprobat

## Ce nu intră în scope

## Stare înainte

## Analiză și decizii

## Implementare
- Fișiere create:
- Fișiere modificate:
- Fișiere șterse:
- Migrări:
- RLS / securitate:
- Environment variables:

## Comportament rezultat

## Verificări
- Comenzi rulate:
- Rezultate:
- Teste adăugate / modificate:
- Verificare manuală:

## Securitate multi-tenant

## Riscuri și limitări

## Ce nu a fost implementat

## Următorul pas recomandat

## Reguli pentru agentul următor
```

### Note la completare

- **Status:** ex. `finalizată` / `parțială` / `blocată`.
- **Documente citite:** listează path-uri reale.
- **Environment variables:** menționează **numele** variabilelor noi; **niciodată** valorile.
- **Securitate multi-tenant:** confirmă explicit Host-only, lipsa leak-urilor, DTO public.
- **Următorul pas recomandat:** de regulă următoarea etapă din §3, dacă nu există blocker.

---

## 7. Reguli permanente de securitate

Valabile în **toate** etapele. Încălcarea oprește etapa.

1. **Tenantul se rezolvă numai din Host** (`Host` / `x-forwarded-host` + root domain).
2. **Nu accepta** `tenant_id` (sau echivalent) din client ca sursă de adevăr.
3. **Nu folosi** `service_role` pe path-urile de request ale utilizatorilor.
4. **Nu dezactiva** RLS și **nu elimina** FORCE RLS pe tabelele de business.
5. **Nu elimina** FK `profiles.id → auth.users.id`.
6. **Nu permite** acces sau mutare **cross-tenant**.
7. **DTO public** fără VIN, id-uri interne, plan, secret branding brut sau alte date private.
8. **Nu afișa** `.env.local`, `DATABASE_URL`, token-uri, chei API sau conținut de secrete.
9. **Commit / push / deploy** numai cu cerere **explicită** a utilizatorului.
10. **Nu** face force push pe `master` (și evită force push pe orice branch protejat).

Defense in depth rămâne: RLS + context sesiune (`withTenantContext`) + assert-uri server (`assertSameTenant` / membership / rol).

---

## 8. Ce nu face acest director (încă)

- Nu conține încă fișierele `14-….md` … `25-….md` (se creează pe măsură ce etapele se termină).
- Nu înlocuiește `docs/stages/` pentru etapele 0–12.
- Nu autorizează singur startul Etapei 14 — utilizatorul trebuie să ceară explicit etapa.

---

## 9. Checklist rapid pentru agent (la startul unei etape)

- [ ] Am citit sursele din §2 relevante pentru etapă
- [ ] Am citit handoff-ul etapei anterioare din `docs/handoffs/` (dacă există)
- [ ] Am un plan cu scope / non-scope
- [ ] Am raportat planul dacă riscul e semnificativ
- [ ] Implementez doar etapa curentă
- [ ] Rulez verificările
- [ ] Scriu `docs/handoffs/NN-….md` după template
- [ ] Nu am rescris documente vechi
- [ ] Nu am commit/push/deploy fără cerere
- [ ] Nu am expus secrete

---

*Proces stabilit: 8 octombrie 2026. Primul fișier din director: acest README.*
