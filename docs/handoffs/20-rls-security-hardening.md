# Handoff — Etapa 20: RLS real & security hardening multi-tenant

## Meta
- Data: 9 octombrie 2026
- Workspace: `C:\Users\Wolf\dev\aplicatie-masini`
- Branch: `master`
- Bază: după Etapa 19 (`69187d0`)
- Status: implementată local (teste + fix policy finance); **fără** commit / push / deploy până la aprobare
- Documente citite:
  - `docs/handoffs/README.md`
  - `docs/handoffs/17-lead-email-delivery.md`
  - `docs/handoffs/18-demo-catalog-cleanup.md`
  - `docs/handoffs/19-finance-leads.md`
  - `docs/security.md`
  - `docs/auth-tenancy.md`
  - `docs/database.md`

## Obiectiv

Valida izolarea multi-tenant sub roluri **fără** `BYPASSRLS` (`anon` / `authenticated` via `SET LOCAL ROLE`), pe `leads`, `finance_applications`, `vehicles`, `vehicle_media`.

## Scope aprobat

- Helper `SET LOCAL ROLE` + assert `rolbypassrls=false`
- Suite RLS reale (tranzacții + rollback)
- Izolare ACME / Beta
- Handoff
- Fix policy **doar** dacă un test demonstrează un bug real

## Ce nu intră în scope

- Cron expirare rezervări (rămâne pe roadmapul original al Etapei 20 din README)
- Renumerotare etape / marketing / email real / Redis / CAPTCHA / Template 2 / CMS / Expo / Vercel

## Deviație față de roadmap

În `docs/handoffs/README.md`, Etapa 20 e listată ca `20-reservation-expiry-jobs`.
Utilizatorul a cerut explicit **security hardening RLS** ca Etapa 20. Handoff-ul documentează această deviație temporară; **cronul rezervărilor** rămâne follow-up pe roadmap (fără renumerotare în această etapă).

Marketing integrations rămân pentru **Etapa 23 actualizată** (cu CMS/SEO), nu aici.

## Stare înainte

- FORCE RLS pe tabelele business
- Testele isolation rulau pe `postgres` cu `rolbypassrls=true` → deny-urile erau mascate / skipped
- Finance INSERT policy folosea `EXISTS` pe `leads` / `vehicles` vizibile prin RLS-ul acelor tabele

## Analiză și decizii

1. **`SET LOCAL ROLE anon|authenticated`** în tranzacție este suficient — nu e obligatoriu un rol login nou.
2. **`INSERT … RETURNING` sub anon** eșuează pe `leads` pentru că SELECT policy ascunde rândul nou; testele folosesc UUID explicit fără `RETURNING`.
3. **Bug real demonstrat:** `EXISTS (SELECT … FROM leads)` în policy-ul finance eșuează sub anon (leads SELECT RLS). Fix: `app.lead_belongs_to_tenant` (SECURITY DEFINER).
4. **Bug real demonstrat:** `EXISTS` pe `vehicles` poate fi afectat de vizibilitatea publică cross-tenant a vehiculelor `available`. Fix: `app.vehicle_belongs_to_tenant` (SECURITY DEFINER).
5. **Gap documentat (neschimbat):** `leads` INSERT nu leagă `vehicle_id` de `tenant_id` — app-layer (Host+slug) rămâne autoritatea; follow-up policy opțional.
6. UPDATE public: tipic **0 rânduri**, nu throw — testat ca atare.

## Implementare

### Fișiere create
- `packages/db/src/__tests__/rls-role-helpers.ts`
- `packages/db/src/__tests__/rls-real.isolation.test.ts`
- `packages/db/drizzle/0007_finance_lead_tenant_helper.sql`
- `packages/db/drizzle/0008_finance_vehicle_tenant_helper.sql`
- `packages/db/drizzle/meta/0007_snapshot.json`
- `packages/db/drizzle/meta/0008_snapshot.json`
- `docs/handoffs/20-rls-security-hardening.md`

### Fișiere modificate
- `packages/db/drizzle/meta/_journal.json`
- `packages/db/src/__tests__/public-storefront.isolation.test.ts` — assert policy finance pe `lead_belongs_to_tenant`

### Migrări
- `0007_finance_lead_tenant_helper` — `app.lead_belongs_to_tenant` + rewrite policy INSERT finance
- `0008_finance_vehicle_tenant_helper` — `app.vehicle_belongs_to_tenant` + rewrite policy INSERT finance

### RLS / securitate
- Roluri testate: `anon`, `authenticated` cu `rolbypassrls=false` (assert hard-fail)
- Staff: GUC `app.profile_id` / `app.tenant_id` pentru ACME vs Beta
- Fără service_role pe path de test RLS
- Date efemere doar în tranzacții rollback

### Environment variables
- Neschimbate (doar `DATABASE_URL` + `SEED_PROFILE_*` pentru rulare online)

## Comportament rezultat

### Acceptat
- Anon INSERT lead pe tenant active
- Anon INSERT finance valid (lead companion + vehicle same-tenant)
- Anon SELECT vehicles doar `available`
- Staff ACME SELECT leads/finance/vehicles ACME
- Staff Beta izolat de ACME

### Refuzat
- Lead/finance pe tenant fals / inactiv
- Finance cu `vehicle_id` / `lead_id` străin sau relație inconsistentă
- Anon SELECT leads/finance
- Anon UPDATE (0 rows)
- Staff Beta UPDATE/SELECT pe ACME
- Staff ACME `UPDATE tenant_id → Beta` (WITH CHECK)

### Gap rămas
- Lead INSERT cu `vehicle_id` din alt tenant: **permis de policy** (documentat în test); Server Action rămâne gardianul

## Verificări
- Comenzi: `pnpm db:migrate` (0007+0008), `pnpm db:test`, `pnpm typecheck`, `pnpm --filter @auto-platform/web test`, `pnpm --filter @auto-platform/web build`
- Suite RLS: 27 teste în `rls-real.isolation.test.ts` (26 online + 1 offline doc)

## Securitate multi-tenant

- App-layer (Etapa 17/19) și SQL-RLS sunt straturi separate; suitele unit existente acoperă Host/slug/Hobby/honeypot.
- Runtime app încă poate folosi `DATABASE_URL` pe rol cu bypass — follow-up: rol runtime fără bypass.

## Riscuri și limitări

1. Runtime `postgres` + BYPASSRLS în lokal/prod connection string
2. Grant-uri largi pe `anon` (mitigate de FORCE RLS)
3. Gap `leads.vehicle_id` cross-tenant la nivel RLS
4. `INSERT RETURNING` sub anon pe leads necesită policy SELECT suplimentară dacă path-ul trece pe rol anon
5. Cron rezervări încă nedemarat

## Ce nu a fost implementat

- Cron `20-reservation-expiry-jobs`
- Schimbare Hobby / email real / marketing / CMS / Expo
- Rol login dedicat `DATABASE_URL_RLS_TEST` (opțional)

## Următorul pas recomandat

1. Verificare finală + commit/push la cerere
2. Follow-up: policy `leads` vehicle same-tenant (opțional)
3. Revenire la roadmap: cron expirare rezervări
4. Etapa 23: CMS/SEO + marketing integrations (conform decizie)

## Note pentru agentul următor

- Nu rescrie migrările 0007/0008
- Nu masca fail RLS cu skip pe bypass
- Helper: mereu `ROLLBACK TO SAVEPOINT` după callback (inclusiv după `expect().rejects`)
- Nu face commit/push/deploy fără cerere explicită
