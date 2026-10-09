# Handoff — Etapa 21: Team invitations + roles

## Meta
- Data: 9 octombrie 2026
- Workspace: `C:\Users\Wolf\dev\aplicatie-masini`
- Branch: `master` (lucru local, necomis)
- Bază: după Etapa 20 (`8ee603e` / RLS real)
- Status: implementată local (migrări + UI + teste + build); **fără** commit / push / deploy
- Documente citite:
  - `docs/handoffs/README.md`
  - `docs/handoffs/20-rls-security-hardening.md`
  - `docs/handoffs/19-finance-leads.md`
  - `docs/handoffs/17-lead-email-delivery.md`
  - `HANDOFF_Functionalitati.md`
  - `HANDOFF_Status_Actual_Aplicatie_Auto_Platform.md`
  - `docs/database.md`
  - `docs/security.md`
  - `docs/auth-tenancy.md`

## Obiectiv

Invitații de echipă pe tenant + administrare roluri, cu token single-use, RLS owner-only, acceptare pentru user existent și user nou, email noop/log.

## Scope aprobat

- Tabel `tenant_invitations` + FORCE RLS
- Owner-only: create / revoke / resend / change role / remove member
- Roluri invitabile: `manager` | `sales` | `viewer` (fără `admin`, fără `owner`)
- Token ≥256 biți, stocare doar hash, TTL 7 zile, single-use
- Accept: login + signup controlat
- Email: `LEAD_EMAIL_PROVIDER` noop|log (Etapa 17), fără Resend
- Teste RLS pe pattern Etapa 20 (`SET LOCAL ROLE`, fără `BYPASSRLS`)
- UI `/dashboard/settings/team` + `/invite/[token]`
- Handoff

## Ce nu intră în scope

- Cron rezervări, marketing integrations, GA/Ads/Merchant, Meta/TikTok, CMS, SEO, Template 2, Expo
- Resend / email real, CAPTCHA, Redis/Upstash
- Schimbări Hobby gating, Vercel, `.env.local`
- Rol `admin`
- Commit / push / deploy (până la verificare finală separată)

## Roluri reale

| Rol | În membership | Invitat? | Administrează invitații / roluri |
|-----|---------------|----------|-----------------------------------|
| `owner` | da | **nu** | da (exclusiv) |
| `manager` | da | da | nu |
| `sales` | da | da | nu |
| `viewer` | da | da | nu |
| `admin` | **nu există** | — | — |

## Schema

### Migrări (noi, istorice neschimbate)

| Tag | Conținut |
|-----|----------|
| `0009_tenant_invitations` | enum status, tabel, indexes, FORCE RLS, policies owner-only |
| `0010_memberships_owner_only_and_accept_invite` | membership INSERT/UPDATE → owner-only; `app.accept_tenant_invitation`; `app.peek_tenant_invitation` |
| `0011_tenant_member_email_helper` | `app.tenant_member_email_exists` (check membru existent fără a relaxa `profiles` RLS) |

### `tenant_invitations`

Coloane: `id`, `tenant_id`, `email`, `role`, `token_hash`, `invited_by_profile_id`, `status`, `expires_at`, `accepted_at`, `accepted_by_profile_id`, `revoked_at`, `created_at`, `updated_at`.

Constrângeri:
- email lowercase + trim (`CHECK`)
- role ∈ (`manager`,`sales`,`viewer`) — `owner` respins la schema
- unique `token_hash`
- unique partial (`tenant_id`,`email`) WHERE `status = 'pending'`

Statusuri: `pending` | `accepted` | `expired` | `revoked`.

## Token security

- `randomBytes(32)` → hex (256 biți)
- SHA-256 hash la persistare; comparare pe hash
- Tokenul brut **nu** e în DB, JSON, dashboard sau loguri (notifier noop/log fără token)
- Rate limit in-memory pe create / accept / resend (pattern lead public)

## Flux creare (owner)

1. Host → tenant; `requireSettingsOwner`
2. Normalize email + allowlist rol
3. `app.tenant_member_email_exists` → refuz dacă deja membru
4. Revocă pending anterior pentru același email
5. Generează token, persistă hash, audit `invitation_created`
6. Notifier best-effort; invitația rămâne pending dacă notifierul eșuează
7. Răspuns neutru (fără token / UUID către client)

## Flux acceptare

### User existent
`/invite/[token]` → login cu `next` sanitizat → accept Server Action → `app.accept_tenant_invitation` → dashboard.

### User fără cont
Signup controlat (email locked la adresa invitației) → sesiune → același accept → dashboard.

Helperul SECURITY DEFINER verifică: hash, tenant activ, email match, rol invitabil, single-use, insert membership atomic. Nu expune rânduri arbitrare.

**Limitare signup:** dacă proiectul Supabase cere confirmare email și `signUp` nu returnează sesiune, utilizatorul trebuie să confirme / să se autentifice, apoi să revină pe link — fără bypass.

## Revocare / resend

- Revoke: `pending` → `revoked` (istoric păstrat)
- Resend: revocă pending vechi, creează pending nou (token + expirare noi); nu pentru `accepted`
- Expirare lazy la peek/accept → `expired`

## Membri / roluri

Owner poate schimba roluri doar spre `manager|sales|viewer`, nu poate promova la `owner`, protejează ultimul owner la demote/remove. Membership INSERT/UPDATE RLS aliniat la owner-only (0010).

## RLS

- `ENABLE` + `FORCE` pe `tenant_invitations`
- SELECT/INSERT/UPDATE: owner + tenant curent; rol invitabil în WITH CHECK
- anon / non-owner / cross-tenant: refuz
- Fără service role pe path user; fără BYPASSRLS în teste
- Accept/peek: helpers înguste SECURITY DEFINER

## Email

Reutilizează `LEAD_EMAIL_PROVIDER` (`noop` | `log`). **Invitațiile pending nu ajung într-un inbox real în această etapă.** Livrare reală / Resend rămân follow-up (Etapa 23 marketing / infrastructură email ulterioară).

## Audit log

Acțiuni scrise când pattern-ul existent permite:
- `invitation_created`, `invitation_revoked`, `invitation_resent`
- `invitation_accepted` (best-effort după accept)
- `member_role_changed`, `member_removed`

Nu se loghează: token, hash, parolă. Metadata minimală (rol / from→to). Email complet nu e în metadata.

## UI

- `/dashboard/settings/team` — owner-only: listă membri, invitații pending, Invite / Revoke / Resend, schimbare rol, eliminare
- Email colegi: poate lipsi sub `profiles_select_own` — afișat „Email indisponibil (RLS profil)”; **nu** am relaxat policy-ul
- `/invite/[token]` — stări: invalid / expired / revoked / accepted / login / signup / email mismatch / accept
- Fără afișare token / tenant UUID în UI

## Teste

### Unit (`apps/web`)
- normalize email, allowlist rol, owner/admin respinși
- token generate/hash/mismatch/parse
- next path sanitization, last owner, mesaje neutre

### RLS (`packages/db`, pattern Etapa 20)
- owner ACME vede doar invitații ACME; Beta nu
- anon empty SELECT
- manager nu INSERT invitations / memberships
- cross-tenant INSERT refuzat
- accept ok + double-accept; email mismatch; expired
- `tenant_member_email_exists`; CHECK respinge `owner`

### Verificări rulate
```text
pnpm db:test          # 76 passed
pnpm typecheck        # ok
pnpm --filter @auto-platform/web test   # 271 passed
pnpm --filter @auto-platform/web build  # ok (/invite/[token] inclus)
```

## Limitări / follow-up

1. Email invitație = noop/log — fără inbox real; linkul de accept nu e livrat automat.
2. Signup depinde de politica Supabase (confirmare email).
3. Emailuri colegi ascunse de `profiles_select_own` (documentat, neschimbat).
4. Rate limit in-memory (single-node) — Redis rămâne out of scope.
5. Cron rezervări rămâne pe roadmap (deviație Etapa 20).
6. Marketing integrations → **Etapa 23 actualizată** (cu CMS/SEO), nu aici.

## Integrare viitoare Etapa 23

Când Etapa 23 (sau o etapă email) activează provider real, notifierul invitațiilor poate trece de la noop/log la trimitere inbox, păstrând aceleași contracte (fără token în loguri publice, best-effort, invitația rămâne în DB).

## Confirmare livrare

- **Nu** s-a făcut commit.
- **Nu** s-a făcut push.
- **Nu** s-a făcut deploy.
