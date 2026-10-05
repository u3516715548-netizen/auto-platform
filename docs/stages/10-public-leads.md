# Etapa 10 — Lead-uri (formular public, anti-spam, dashboard, notificări)

**Status:** **FINALIZATĂ local** (10A–10D)

## Rezumat

| Subetapă | Livrabil |
|----------|----------|
| **10A** | Contract contact (email **sau** telefon), honeypot, cooldown, dedup 30 min, rate limit IP (in-memory **dev/single-node**) |
| **10B** | Dashboard `/dashboard/leads` + detaliu; status + atribuire; roluri viewer vs staff |
| **10C** | Destinatari Settings (max 3), email best-effort noop, badge `new` în nav |
| **10D** | Formular public Template 1 (a11y, sticky `#contact`, copy RO) + docs |

## Contracte păstrate

- Tenant doar din Host; fără `tenant_id` / `vehicle_id` din client.
- Lead doar pe `/vehicles/[slug]` (nu pe catalog); vehicul `available`.
- Contact privat (dashboard); nu în DTO public / URL.
- RLS neschimbat; fără `service_role` pe path user.
- Rate limit in-memory = **nu** protecție multi-instance producție.
- Email: adaptor noop/log; fără provider live până la implementare aprobată.

## Flux public (10A + 10D)

1. Formular `#contact` pe detaliu → sticky „Mesaj” scrollează + focus pe `lead-form-heading`.
2. Server: honeypot → rate limit → parse → cooldown cookie → vehicle gate → dedup → insert.
3. După insert: notificare best-effort (dacă există destinatari); eșecul nu anulează lead-ul.
4. UI: accent `--sf-accent` / `primaryColor`; CTA „Trimite solicitarea”; hint „cel puțin e-mail sau telefon”.

## Dashboard (10B)

- Listă + filtre Toate / Noi / În lucru / Finalizate.
- Detaliu: status, atribuire (owner/manager/sales); viewer read-only.
- Audit: `lead.status.update`, `lead.assignment.update` (fără PII).
- Badge (10C): count `status=new`, ascuns la 0, `99+`.

## Settings notificări (10C)

- `branding.leadNotificationEmails` — max 3, empty OK, **nu** public.
- Doar owner scrie; audit `changedKeys` fără adrese.
- Env: `LEAD_EMAIL_PROVIDER=noop|log` (default noop).

## Limitări cunoscute

1. Email producție: lipsește provider SDK/API; rămâne noop.
2. Rate limit: necesar Redis/KV + `LEAD_RATE_LIMIT_SECRET` + proxy de încredere.
3. `profiles_select_own`: nume assignee poate cădea pe fallback `Membru · {rol}` sub RLS strict.
4. Sales vede toate lead-urile tenantului (conform RLS; fără assigned-only).

## Fișiere cheie

| Zonă | Path |
|------|------|
| Public form | `components/storefront/public-lead-form.tsx`, `lib/storefront/lead-form-ui.ts` |
| Insert / anti-spam | `create-public-lead.ts`, `lib/leads/*` (rate limit, dedup, IP) |
| Dashboard | `app/dashboard/leads/*`, `lib/leads/list-leads.ts`, update/assign |
| Notificări | `lib/notifications/lead-email.ts`, Settings branding |
| Badge | `count-new-leads.ts`, `new-leads-badge.ts`, `dashboard/layout.tsx` |

## Verificare

```bash
pnpm --filter @auto-platform/web test
pnpm --filter @auto-platform/web lint
pnpm typecheck
pnpm --filter @auto-platform/web build
# opțional izolare DB:
pnpm db:test
```

## Non-goals (Etapa 10)

CAPTCHA · SMS / WhatsApp Business · lead pe catalog · migrări/RLS · job queue · rezervări · CRM avansat.
