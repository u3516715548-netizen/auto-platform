# Handoff — Etapa 19: Lead-uri de finanțare (varianta A)

## Meta
- Data: 9 octombrie 2026
- Workspace: `C:\Users\Wolf\dev\aplicatie-masini`
- Branch: `master`
- Ultimul commit (bază, înainte de această etapă): `8759a5c` — *Add Stage 17 public lead consent and email notification status.*
- Status: implementată local; **fără** commit / push / deploy (așteaptă verificare finală + aprobare explicită)
- Documente citite:
  - `docs/handoffs/README.md`
  - `docs/handoffs/17-lead-email-delivery.md`
  - `docs/handoffs/18-demo-catalog-cleanup.md`
  - `HANDOFF_Functionalitati.md`
  - `HANDOFF_Status_Actual_Aplicatie_Auto_Platform.md`
  - `docs/database.md`
  - `docs/security.md`
  - `docs/auth-tenancy.md`

## Obiectiv

Persistă cererile din fluxul storefront „Aplică acum” / calculator finanțare ca entitate separată `finance_applications`, cu lead companion (`source = 'finance'`), fără email real și fără CRM finance dedicat.

## Scope aprobat

1. Tabel separat `finance_applications`
2. Lead companion în `leads` cu `source = 'finance'`
3. Relație tenant + vehicul rezolvată exclusiv server-side (Host + slug)
4. Telefon obligatoriu
5. Email obligatoriu
6. Consent obligatoriu, versiunea `finance-v1`
7. Persistarea sumei, perioadei și snapshot-urilor financiare
8. Notificare noop/log pe lead-ul companion (Etapa 17)
9. Etichetare „Finanțare” în dashboard-ul existent + detaliu aplicație pe lead
10. Teste unitare + isolation
11. Handoff final

## Ce nu intră în scope

- Email real / Resend / provider extern / chei API
- Redis / Upstash / CAPTCHA
- Upload documente, CNP, acte, venit, IBAN, adresă completă, KYC
- Scoring, eligibilitate oficială, integrare bancară, contracte
- Pagină CRM finance dedicată
- Schimbări Hobby gating (`HOBBY_DEMO_DISABLE_PUBLIC_LEADS`)
- Template 2, CMS, Expo, Wave 3

## Stare înainte

- Calculator + dialog Template 1 existau, dar „Aplică acum” nu persista cereri
- Lead-uri publice storefront (Etapa 10/17) cu consent `v1` + `notification_*` pe `leads`
- Fără tabel / enum finance; fără `source = finance` în UI

## Analiză și decizii

1. **Varianta A:** `finance_applications` separat + companion lead, nu stuffing în `leads` alone.
2. **`lead_id` NOT NULL + ON DELETE CASCADE:** la submit se creează mereu lead + application în aceeași tranzacție; fără application orfană sau lead finance fără application.
3. **Fără `notification_*` pe finance:** livrarea se urmărește pe companion lead via `app.finalize_lead_notification` (Etapa 17).
4. **Status finance ≠ status CRM lead:** enum dedicat (`new` … `archived`); statusul CRM al lead-ului rămâne neschimbat ca model.
5. **Honeypot `website`:** separat de câmpurile firmă/CUI.
6. **Hobby gating:** când `leadsEnabled` / Hobby flag e off, dialogul rămâne informativ, fără insert (aceeași flag ca lead-urile publice; neschimbată).

## Implementare

### Fișiere create
- `packages/db/src/schema/finance-applications.ts`
- `packages/db/drizzle/0006_finance_applications.sql`
- `packages/db/drizzle/meta/0006_snapshot.json`
- `apps/web/src/lib/storefront/parse-finance-application.ts`
- `apps/web/src/lib/storefront/create-finance-application.ts`
- `apps/web/src/lib/leads/get-finance-application-for-lead.ts`
- `apps/web/src/lib/storefront/__tests__/etapa19-finance-leads.test.ts`
- `docs/handoffs/19-finance-leads.md`

### Fișiere modificate
- `packages/db/src/schema/enums.ts` — `finance_applicant_type`, `finance_application_status`
- `packages/db/src/schema/index.ts`
- `packages/db/drizzle/meta/_journal.json`
- `packages/db/src/__tests__/public-storefront.isolation.test.ts`
- `packages/types/src/index.ts` — CUI, Zod finance, `FINANCE_CONSENT_VERSION`
- `apps/web/src/lib/storefront/public-vehicles.ts` — `getPublicVehicleForFinance`
- `apps/web/src/lib/leads/public-lead-rate-limit.ts` — endpoint finance
- `apps/web/src/lib/leads/status-label.ts` — „Finanțare”
- `apps/web/src/components/storefront/vehicle-finance-panel.tsx`
- `apps/web/src/components/storefront/public-vehicle-detail.tsx`
- `apps/web/src/app/dashboard/leads/[leadId]/page.tsx`
- `apps/web/src/lib/leads/__tests__/etapa10b-dashboard-leads.test.ts`

### Fișiere șterse
- N/A (duplicate generat Drizzle `0006_furry_the_stranger.sql` a fost înlocuit de migrarea hand-written înainte de commit)

### Migrări
- `0006_finance_applications` — enums, tabel, CHECK-uri (term/amount), FK-uri, indexuri, ENABLE + FORCE RLS, politici INSERT/SELECT/UPDATE, GRANT anon INSERT

### Schema finală (`public.finance_applications`)

| Coloană | Note |
|---------|------|
| `id` | uuid PK |
| `tenant_id` | NOT NULL, CASCADE pe tenants |
| `vehicle_id` | nullable, ON DELETE SET NULL |
| `lead_id` | NOT NULL, CASCADE pe leads |
| `applicant_type` | `individual` \| `company` |
| `full_name` | nume PF sau denumire PJ |
| `company_tax_id` | nullable; CUI digits-only pentru company |
| `email`, `phone` | obligatorii |
| `amount_eur`, `term_months` | sumă > 0; term ∈ {12,24,36,48,60} |
| `vehicle_price_eur_snapshot` | preț DB la submit |
| `estimated_monthly_eur_snapshot` | rată estimativă (APR 4.9%) |
| `consent_at`, `consent_version` | server-side; default/`finance-v1` |
| `status` | status finance (nu CRM) |
| `created_at`, `updated_at` | timestamps |

### Relația lead / application
1. Insert lead companion: `source='finance'`, `consent_version='finance-v1'`, `notification_status='pending'`
2. Insert `finance_applications` cu același `tenant_id` / `vehicle_id` / `lead_id`
3. Tranzacție atomică — rollback dacă oricare eșuează
4. Notificare best-effort pe lead; eșecul notificării **nu** anulează aplicația

### RLS / securitate
- ENABLE + FORCE RLS pe `finance_applications`
- INSERT public: profil anonim + tenant `active` + vehicle (dacă setat) aparține tenantului + `lead_id` același tenant
- SELECT: `app.has_tenant_access(tenant_id)`
- UPDATE: roluri staff `owner|manager|sales` (+ WITH CHECK pe tenant curent)
- Fără UPDATE public larg; fără bypass RLS pe request user; fără service role pe request public

### Environment variables
- N/A noi. Reutilizează `LEAD_EMAIL_PROVIDER=noop|log` și `HOBBY_DEMO_DISABLE_PUBLIC_LEADS` existente.

## Comportament rezultat

### Flux Server Action (`createFinanceApplicationAction`)
1. Hobby gating → refuz neutru fără write
2. Host → tenant; refuz tenant inactiv
3. Honeypot `website` → succes neutru fără insert
4. Rate-limit attempt (in-memory, endpoint finance)
5. Parse/validate FormData (Zod)
6. Cooldown cookie finance + dedup contact+vehicul
7. Vehicul după slug, doar `available`, în tenantul Host; preț din DB
8. Sumă ≤ preț curent
9. Tranzacție lead + finance_application
10. Notify noop/log pe lead + `finalize_lead_notification`
11. Răspuns public: succes neutru, fără ID-uri / statusuri tehnice

### UI
- Calculator + dialog Template 1 păstrate
- Câmpuri: tip, nume/denumire, CUI (doar PJ), email, telefon, sumă, perioadă, consent, honeypot
- Disclaimer rată estimativă
- Succes: „Cererea ta a fost înregistrată. Te vom contacta pentru următorii pași.”
- `leadsEnabled=false` / preview: informativ, fără DB write

### Dashboard
- `source=finance` → etichetă „Finanțare”
- Detaliu lead: secțiune cerere finanțare (staff tenant, via membership + RLS)
- Fără pagină CRM finance dedicată

### Validări (server = autoritate)
- `applicant_type` obligatoriu; PF: nume; PJ: denumire + CUI structural RO (fără ANAF)
- Email + telefon obligatorii și valide
- Sumă > 0 și ≤ preț vehicul; term doar 12/24/36/48/60
- Consent obligatoriu; `consent_at` server-side; `consent_version='finance-v1'`
- Clientul nu este autoritate pentru `tenant_id` / `vehicle_id` / `lead_id` / status / preț

### Statusuri
- **Finance:** `new`, `contacted`, `in_review`, `approved`, `rejected`, `withdrawn`, `archived`
- **Lead CRM:** neschimbat (`new` … `archived` CRM)
- **Notificare:** pe companion lead (`pending` / `not_configured` / `no_recipients` / `failed` / etc. Etapa 17)

## Verificări
- Comenzi rulate:
  - `pnpm db:test` — 8 files / 40 tests passed
  - `pnpm typecheck` — OK
  - `pnpm --filter @auto-platform/web test` — 42 files / 259 tests passed (inclusiv `etapa19-finance-leads`)
  - `pnpm --filter @auto-platform/web build` — OK (Next 16.3.8)
- Teste adăugate / modificate:
  - Unit: parse PF/PJ, CUI invalid, email/telefon/consent, sumă, term, honeypot, smuggling IDs, snapshot helper, mesaj neutru, label Finanțare
  - Isolation: insert finance+lead, cross-tenant `lead_id` blocked (când rolul nu bypassează RLS), policy INSERT cere tenant active + lead same-tenant
- Verificare manuală: N/A în această rundă (smoke UI acoperit structural în panel + gating)

## Securitate multi-tenant

- Tenant din Host; vehicul din slug + `available` + același tenant
- Golf / arhivat / alt tenant → fără insert
- RLS blochează atașarea unei aplicații la lead străin
- Dashboard finance detail doar prin `requireMembership` + `withTenantContext`
- Răspunsul public nu expune ID-uri, status notificare, tenant ID

## Riscuri și limitări

1. Rate-limit in-memory: nu e multi-instance (fără Redis — out of scope)
2. Notificare tot noop/log — dealerul nu primește email real
3. CUI structural ≠ verificare ANAF
4. Rata lunară e estimativă (APR fix 4.9%); nu e ofertă
5. Status finance pe dashboard e afișat ca token brut (fără workflow UI de schimbare status finance în Etapa 19)
6. Dedup/cooldown reutilizează pattern lead; ferestrele pot bloca re-submit legitim rapid pe același contact+vehicul
7. Roluri DB cu `BYPASSRLS` pot masca eșecuri RLS în teste isolation (documentat ca și la Etapa 5/17)

## Ce nu a fost implementat

- Email real / Resend
- CAPTCHA, Redis, documente, KYC, scoring, bancă, contracte
- Pagină CRM finance / mutații status finance din UI
- Schimbări Hobby gating, Template 2, CMS, Expo, Wave 3

## Următorul pas recomandat

1. Verificare finală + aprobare explicită → commit / push / migrate pe medii
2. Etapa următoare din roadmap (`20-reservation-expiry-jobs`) sau, când e cerut, wiring email real pe path-ul existent Etapa 17 (inclusiv lead-uri `source=finance`)

## Note pentru agentul următor

- Nu modifica migrările istorice `0004`/`0005`/`0006`
- Nu duplica `notification_*` pe `finance_applications` fără motiv arhitectural
- Hobby flag: nu schimba fără cerere explicită
- Commit/push/deploy doar la cerere explicită după verificare finală
