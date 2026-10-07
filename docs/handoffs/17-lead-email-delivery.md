# Handoff — Etapa 17: Email lead (variantă minimă)

## Meta
- Data: 8 octombrie 2026
- Workspace: `C:\Users\Wolf\dev\aplicatie-masini`
- Branch: `master`
- Ultimul commit: `6874332` — *Ship stages 15–16–18: perf audit/handoffs, storefront image optimization, ACME demo catalog cleanup.*
- Status: finalizată (variantă minimă — fără Resend)
- Documente citite:
  - `docs/handoffs/README.md`
  - `docs/handoffs/15-performance-audit.md`
  - `docs/handoffs/16-performance-optimization.md`
  - `docs/handoffs/18-demo-catalog-cleanup.md`
  - `HANDOFF_Functionalitati.md`
  - `HANDOFF_Status_Actual_Aplicatie_Auto_Platform.md`
  - `docs/database.md`
  - `docs/security.md`
  - `docs/auth-tenancy.md`

## Obiectiv

Închide golurile față de Etapa 10 pentru lead-uri publice: consimțământ obligatoriu, email obligatoriu, persistarea statusului de notificare email, fără trimitere reală (noop/log).

## Scope aprobat

- Consimțământ obligatoriu (UI + server) + `consent_at` / `consent_version=v1`
- Email obligatoriu; telefon opțional (validat dacă e prezent)
- Coloane `notification_*` + enum `lead_notification_status`
- Notificare best-effort noop/log + actualizare status după insert
- Teste + handoff final
- **Fără** Resend, chei API, Redis, CAPTCHA, finance leads, cron retry

## Ce nu intră în scope

- Provider email real (Resend / similar)
- Rate-limit multi-instance (Upstash/Redis)
- Lead-uri finanțare (Etapa 19)
- Inbox dealer / UI pe `notification_status`
- Wave 3 performanță, modificări deploy settings

## Stare înainte

- Tabel `leads` + RLS + Server Action `createPublicLeadAction` + `PublicLeadForm` existau (Etapa 10)
- Regula era „email SAU telefon”; fără checkbox consimțământ; fără coloane de livrare email
- `LEAD_EMAIL_PROVIDER=noop|log` — fără persistarea rezultatului

## Analiză și decizii

1. **Extindere `leads`**, nu tabel nou; `status` CRM neschimbat.
2. **UPDATE post-notificare:** policy `leads_update_staff` blochează UPDATE anonim. Soluție: funcție îngustă `app.finalize_lead_notification` (SECURITY DEFINER) care actualizează doar coloanele `notification_*` pentru `lead_id` + `tenant_id` pe tenant `active` — fără UPDATE public general.
3. **Nu setăm `sent`** în Etapa 17; mapper-ul mapează orice `sent` accidental la `not_configured`.
4. Tenant/vehicul rămân rezolvate doar din Host + slug; clientul nu livrează ID-uri de asociere.

## Implementare
- Fișiere create:
  - `packages/db/drizzle/0004_lead_consent_notification.sql`
  - `packages/db/drizzle/0005_finalize_lead_notification.sql`
  - `packages/db/drizzle/meta/0004_snapshot.json`
  - `packages/db/drizzle/meta/0005_snapshot.json`
  - `apps/web/src/lib/notifications/map-lead-notification-status.ts`
  - `apps/web/src/lib/storefront/__tests__/etapa17-public-leads.test.ts`
  - `docs/handoffs/17-lead-email-delivery.md`
- Fișiere modificate:
  - `packages/db/src/schema/enums.ts`
  - `packages/db/src/schema/leads.ts`
  - `packages/db/drizzle/meta/_journal.json`
  - `packages/db/src/__tests__/public-storefront.isolation.test.ts`
  - `packages/types/src/index.ts`
  - `apps/web/src/lib/storefront/parse-public-lead.ts`
  - `apps/web/src/lib/storefront/create-public-lead.ts`
  - `apps/web/src/lib/storefront/lead-form-ui.ts`
  - `apps/web/src/components/storefront/public-lead-form.tsx`
  - `apps/web/src/lib/leads/__tests__/etapa10a-public-leads.test.ts`
  - `apps/web/src/lib/storefront/__tests__/public-storefront.test.ts`
  - `apps/web/src/lib/storefront/__tests__/etapa10d-lead-form-ui.test.ts`
- Fișiere șterse: N/A
- Migrări:
  - `0004_lead_consent_notification` — enum + coloane + backfill (`consent_at=created_at`, `notification_status=skipped`)
  - `0005_finalize_lead_notification` — `app.finalize_lead_notification(...)`
- RLS / securitate:
  - Politicile INSERT/SELECT/UPDATE pe `leads` neschimbate
  - Fără service role pe path user; fără bypass RLS
  - Finalize doar pe match exact lead+tenant + tenant active
- Environment variables:
  - Neschimbate ca cerință: `LEAD_EMAIL_PROVIDER` rămâne `noop` | `log` (default noop)
  - **Nicio** cheie Resend / API email adăugată

## Comportament rezultat

- Formular public: nume, email (required), telefon (optional), mesaj (optional), checkbox consimțământ; submit disabled fără consent
- Insert: `consent_at` server-side, `consent_version=v1`, `notification_status=pending`
- După notify noop/log: `not_configured` | `no_recipients` | `failed` (+ `notification_attempted_at`, `notification_reason` cod scurt)
- UI public: mesaj de succes neutru; fără status tehnic / ID-uri
- Vehicul non-`available` / tenant inactiv / cross-tenant: fără insert (comportament existent păstrat)

## Verificări
- Comenzi rulate:
  - `pnpm db:migrate` (0004 + 0005)
  - `pnpm db:test`
  - `pnpm typecheck`
  - `pnpm --filter @auto-platform/web test`
  - `pnpm --filter @auto-platform/web build`
- Rezultate:
  - db:test — 37 passed
  - typecheck — OK
  - web test — 248 passed
  - web build — OK
- Teste adăugate / modificate:
  - `etapa17-public-leads.test.ts` (consent, email required, map status, shape răspuns)
  - actualizări etapa10a / public-storefront / etapa10d
  - isolation: insert cu consent + `finalize_lead_notification` + anti cross-tenant
- Verificare manuală (local `acme.localhost:3000`):
  - Koenigsegg: checkbox consimțământ vizibil; submit disabled fără consent; email required; submit valid → „Solicitarea a fost trimisă…”
  - `golf-8-acme` → 404 (fără formular public)
  - Preview Template 1 / Beta: neatinse în această etapă

## Securitate multi-tenant

- Tenant doar din Host; vehicul doar din slug + `available` + același `tenant_id`
- Fără trust în `tenant_id` / `vehicle_id` din client
- Fără logare PII lead / destinatari
- Răspuns public: doar `{ error, success, rateLimited?, retryAfterSeconds? }`

## Riscuri și limitări

- Rate-limit rămâne in-memory (slab pe multi-instance)
- Fără email real — dealerul nu e notificat automat până la o etapă viitoare cu provider aprobat
- Dacă `finalize_lead_notification` eșuează după insert, lead-ul rămâne `pending` (succes public oricum)

## Ce nu a fost implementat

- Resend / trimitere reală / retry cron
- Redis/Upstash, CAPTCHA
- Lead-uri finanțare, inbox pe status notificare
- Expunerea `notification_status` în UI public sau dashboard (în afara coloanelor DB)

## Următorul pas recomandat

Etapa roadmap pentru **email real** (provider gated + env + aprobare), sau următoarea etapă din `docs/handoffs/README.md` pe care o cere utilizatorul (ex. 19 finance leads). Notă: Etapa 18 a fost deja livrată înainte de 17, la cerere explicită.

## Reguli pentru agentul următor

1. Nu trimite email real fără aprobare + `LEAD_EMAIL_PROVIDER` dedicat + cheie configurată.
2. Nu seta `notification_status=sent` până există provider real verificat.
3. Nu slăbi RLS pe `leads`; păstrează finalize-ul îngust sau echivalent.
4. Nu rescrie acest handoff; adaugă etapă nouă dacă e nevoie de follow-up.
5. Commit / push / deploy doar la cerere explicită.
