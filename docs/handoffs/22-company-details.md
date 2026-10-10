# Handoff — Etapa 22: Detalii complete firmă

## Meta
- Data: 9 octombrie 2026
- Workspace: `C:\Users\Wolf\dev\aplicatie-masini`
- Branch: `master` (lucru local, necomis)
- Bază: după Etapa 21 (`5bf456d` / invitații echipă)
- Status: implementată local (migrare + UI + teste + build); **fără** commit / push / deploy
- Documente citite:
  - `docs/handoffs/README.md`
  - `docs/handoffs/21-team-invitations-roles.md`
  - `docs/handoffs/audit-9-octombrie-2026.md`
  - `docs/database.md`
  - `docs/security.md`
  - `docs/auth-tenancy.md`

## Obiectiv

Entitate 1:1 `tenant_company_profiles` pentru identitatea și contactul firmei, cu owner-only mutate, FORCE RLS, proiectie publică explicită (`PublicCompanyView`), fără CUI/IBAN în `branding jsonb`.

## Scope livrat

- Tabel `tenant_company_profiles` + enum `company_entity_type`
- Migrare `0012_tenant_company_profiles` (ENABLE + FORCE RLS)
- `app.public_company_profile(uuid)` SECURITY DEFINER (proiecție îngustă)
- Validări server-side Zod (`upsertCompanyProfileInputSchema`)
- Server Action `upsertCompanyProfileAction` (owner-only) + sync `tenants.name` ← `tradingName`
- UI `/dashboard/settings/company` (secțiuni: identitate, contact, adresă, branding, program)
- Storefront: `PublicCompanyView` pe `PublicTenantView.company`; footer afișează adresă / legal / email / website când există
- Teste unit + RLS + regresie storefront / Preview Template 1
- Handoff

## Schema

### Migrare

| Tag | Conținut |
|-----|----------|
| `0012_tenant_company_profiles` | enum, tabel, indexes, CHECK-uri, FORCE RLS, policies, `app.public_company_profile` |

### `tenant_company_profiles` (1:1 → `tenants`)

| Coloană | Tip | Note |
|---------|-----|------|
| `tenant_id` | uuid PK/FK | cascade delete |
| `legal_name` | text | |
| `trading_name` | text | sync cu `tenants.name` la upsert |
| `tax_id` | text | cifre CUI, fără prefix RO |
| `registration_number` | text | Reg. Com. structural |
| `entity_type` | enum | `srl` \| `sa` \| `pfa` \| `ii` \| `other` |
| `public_email` | text | lowercase |
| `public_phone` | text | E.164 |
| `website` | text | URL normalizat |
| `registered_address` | text | |
| `showroom_address` | text | |
| `city` / `county` / `country` / `postal_code` | text | country default `RO` |
| `business_hours` | jsonb | `{}` default; zile mon–sun + note |
| `logo_path` / `favicon_path` | text | cale relative sau https |
| `currency` | text | `EUR` \| `RON` |
| `created_at` / `updated_at` | timestamptz | |

CHECK: currency allowlist, country ISO-2, tax_id digits, email lower/trim.

## Câmpuri publice vs private

### Publice (`PublicCompanyView` / `app.public_company_profile`)

`legal_name`, `trading_name`, `tax_id`, `registration_number`, `entity_type`, `public_email`, `public_phone`, `website`, `registered_address`, `showroom_address`, `city`, `county`, `country`, `postal_code`, `business_hours`, `logo_path`, `favicon_path`, `currency`.

### Nu apar în proiectia publică

- `tenant_id`, `created_at`, `updated_at`
- IBAN / date bancare (neimplementate)
- secrete, tokenuri, chei API, parole
- `leadNotificationEmails` (rămâne în branding, staff-only)

### Anon

- **fără** policy SELECT pe rândul complet
- citire publică **doar** prin `app.public_company_profile` → mapare `PublicCompanyView`

## Decizie CUI public

CUI-ul (`tax_id`) este expus intenționat în `PublicCompanyView` și footer.

Motiv:
- este un identificator comercial public;
- susține încrederea și verificarea firmei;
- va fi util ulterior pentru LocalBusiness/JSON-LD și Merchant.

Risc:
- identificator fiscal vizibil public.

Mitigare:
- date bancare și IBAN rămân private;
- nu se expun alte date interne;
- proiecția publică este explicită.

## RLS

| Policy | Operație | Regulă |
|--------|----------|--------|
| `tenant_company_profiles_select_member` | SELECT | `app.has_tenant_access(tenant_id)` |
| `tenant_company_profiles_insert_owner` | INSERT | owner + `tenant_id = app.current_tenant_id()` |
| `tenant_company_profiles_update_owner` | UPDATE | owner (USING + WITH CHECK) |
| — | DELETE | fără policy (cascade de la tenant) |

ENABLE + FORCE RLS. Fără service role pe request user. Pattern teste: `SET LOCAL ROLE` (Etapa 20).

## Owner-only

| Rol | UI settings company | SELECT (RLS) | INSERT/UPDATE (RLS) |
|-----|---------------------|--------------|----------------------|
| `owner` | da (edit) | da | da |
| `manager` / `sales` / `viewer` | 404 (`requireSettingsOwner`) | da (membru) | nu |
| anon | — | nu pe rând | nu |
| cross-tenant (Beta→ACME) | — | gol | 0 rows / deny |

Tenantul se rezolvă server-side din Host / sesiune; clientul nu este autoritate pentru `tenant_id`.

## Validări (server)

- denumiri: trim + limite lungime
- email: valid + lowercase
- telefon: `normalizePublicContactNumber` (E.164)
- website: URL http(s) normalizat
- CUI: `normalizeRomanianCui` (checksum, fără ANAF)
- Reg. Com.: `normalizeRomanianRegistrationNumber` (structural)
- țară ISO-2; RO + cod poștal → 6 cifre + localitate obligatorie
- monedă: `EUR` \| `RON`
- program: HH:MM, open < close, note ≤ 200
- logo/favicon: fără `..`, fără data/javascript, fără query cu token/secret

## Audit

| Acțiune | Metadata |
|---------|----------|
| `company.profile.create` | `{ changedKeys }` |
| `company.profile.update` | `{ changedKeys }` |
| `tenant.name.update` | `{ from, to }` (când trading name schimbă numele tenant) |

`changedKeys` folosește flag-uri tip `taxIdSet` / `publicEmailSet` — **fără** CUI complet, email, telefon sau secrete în log.

## UI

- Extindere `/dashboard/settings/company` — formular complet owner-only
- Feedback neutru (banner success/error)
- Fără expunere de ID-uri interne
- WhatsApp rămâne la Personalizare (branding); telefon public poate fi setat aici
- Storefront Template 1: doar afișare date noi în footer (adresă, legal, email, website); fără redesign vizual
- Preview Template 1: neatins (DEMO izolat)

## Teste

| Suită | Acoperire |
|-------|-----------|
| `packages/db/.../tenant-company-profiles.isolation.test.ts` | owner ACME OK; manager/sales/viewer update refuzat; Beta fără read/update; anon fără SELECT rând; public_company_profile; FORCE RLS; manager INSERT deny |
| `apps/web/.../etapa22-company-profile.test.ts` | validări unit; PublicCompanyView mapping; footer links/address/legal |
| regresie | `etapa9b-template1`, `theme-preview-isolation`, `public-storefront` ACME/Beta |

### Verificări rulate

```text
pnpm db:migrate          # OK — 0012 aplicată
pnpm db:test             # OK — 84 passed
pnpm typecheck           # OK
pnpm --filter @auto-platform/web test   # OK — 282 passed
pnpm --filter @auto-platform/web build  # OK
```

## Amânat (nu în Etapa 22)

| Item | Motiv |
|------|-------|
| IBAN / date bancare | privat intern; niciodată public; fără nevoie storefront |
| Social (Facebook/Instagram) | amânat; WhatsApp rămâne branding |
| Telefon secundar / email lead-uri | lead emails deja în branding privat |
| ANAF lookup | explicit exclus |
| Upload logo/favicon | doar referințe path/URL; upload → etapă media ulterioară |
| JSON-LD / SEO / CMS / pagini legale | Etapa 23 |
| Merchant / pixeli / CMP | Etapa 23 |
| Template 2 | Etapa 24 |
| Billing / onboarding SaaS / Mobile Expo | în afara scope |
| Hobby gating / Vercel / env vars | neschimbate |

## Dependențe pentru Etapa 23

Etapa 23 (CMS + SEO) poate consuma:

- `PublicCompanyView` / `app.public_company_profile` pentru JSON-LD Organization / LocalBusiness
- `logo_path` / `favicon_path` ca input SEO
- adresă + program + contact public pentru structured data
- fără a muta CUI/IBAN în `branding jsonb`

## Confirmare proces

- **Nu** s-a făcut commit
- **Nu** s-a făcut push
- **Nu** s-a făcut deploy
- Oprire înainte de verificare finală separată (conform cererii)
