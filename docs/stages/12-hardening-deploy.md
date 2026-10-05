# Etapa 12 — Hardening / deploy (Vercel Hobby demo)

**Status:** pregătire locală — **fără deploy** până la aprobare explicită.

## Scop

Deploy gratuit pe **Vercel Hobby** pentru demo pe telefon / prezentare:

- fără domeniu propriu;
- fără Vercel Pro / DNS wildcard / custom domains;
- fără Resend, Upstash sau cron real;
- **fără** schimbarea contractelor E5–E11 (Host-based tenancy local/producție).

## Strategia A — `HOBBY_DEMO_ONLY` (recomandată)

Pe URL-ul apex generat (`https://proiect.vercel.app`) aplicația poate randa **un singur** tenant demo, cu slug setat **doar** server-side:

```bash
HOBBY_DEMO_ONLY=true
HOBBY_DEMO_TENANT_SLUG=acme
```

**Important:** nu folosi prefixul `VERCEL_DEMO_*` — Vercel rezervă `VERCEL_` și blochează valorile user („Populated by System”).

Local și producție reală rămân strict Host-based:

```text
acme.localhost:3000
beta.localhost:3000
{slug}.domeniu.ro
```

**Interzis ca sursă de adevăr:** query string, path, cookie, client state, request body.

### Gate (toate obligatorii)

Fallback-ul `resolveHobbyDemoTenantSlug` este activ **numai** când:

1. `VERCEL === "1"` (setat de platformă);
2. `HOBBY_DEMO_ONLY === "true"`;
3. `HOBBY_DEMO_TENANT_SLUG` trece `tenantSlugSchema`;
4. Host-ul curent este **exact** un hostname din `VERCEL_URL` / `VERCEL_PROJECT_PRODUCTION_URL`;
5. `NEXT_PUBLIC_ROOT_DOMAIN` = același Host apex `*.vercel.app` (nu domeniu real cu wildcard).

Dacă lipsește orice condiție → **fără** fallback; Host-based neschimbat; fail-closed (fără tenant implicit).

Tenantul demo se încarcă din DB ca în fluxul normal (`active`/`trial`); slug inexistent/suspended → 404 / eroare tenancy, **nu** alt tenant.

Implementare: `apps/web/src/lib/tenant/vercel-demo-only.ts` (server-only).

## Lead-uri pe demo

| Setare | Comportament |
|--------|----------------|
| `LEAD_EMAIL_PROVIDER=noop` | fără email real |
| Rate limit in-memory | **demo-only** / single-node; nu e protecție multi-instance |
| Cron / `reservation.expire` | dezactivat (lazy expiry rămâne) |
| `HOBBY_DEMO_DISABLE_PUBLIC_LEADS=true` | UI: formular dezactivat + sticky „Mesaj” ascuns; Server Action: răspuns neutru, **fără insert** |

Sună / WhatsApp rămân dacă branding-ul demo le are. Dashboard-ul de lead-uri **nu** e afectat.

## Environment variables (fără valori reale)

### Expuse browserului (`NEXT_PUBLIC_*`)

| Nume | Rol |
|------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Auth / client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth / client |
| `NEXT_PUBLIC_ROOT_DOMAIN` | pe Hobby = hostname-ul `*.vercel.app` (apex) |
| `NEXT_PUBLIC_MEDIA_BUCKET` | opțional (default `vehicle-media`) |

### Server-only (nu le prefixa cu `NEXT_PUBLIC_`)

| Nume | Rol |
|------|-----|
| `DATABASE_URL` | Postgres (Session pooler) |
| `SUPABASE_SERVICE_ROLE_KEY` | semnare media / galerie |
| `LEAD_EMAIL_PROVIDER` | `noop` pe demo |
| `LEAD_RATE_LIMIT_SECRET` | pepper hash IP (recomandat pe URL public) |
| `HOBBY_DEMO_ONLY` | `true` doar pe Hobby demo |
| `HOBBY_DEMO_TENANT_SLUG` | slug tenant seed (ex. `acme`) |
| `HOBBY_DEMO_DISABLE_PUBLIC_LEADS` | `true` pentru a bloca formularul public |

Platformă (setate de Vercel, nu le copiezi manual de obicei): `VERCEL`, `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`.

**Nu configura pe Hobby demo:** Resend, Upstash, cron secrets, `DATABASE_URL_MIGRATIONS`.

`.env.local` și `.vercel` sunt în `.gitignore` — nu comite secrete.

## Build pe Vercel (monorepo)

| Setare | Valoare |
|--------|---------|
| Root Directory | `.` (rădăcina monorepo) |
| Node.js | **20.x** |
| Install | `pnpm install` (detectat via `packageManager`) |
| Build | `pnpm --filter @auto-platform/web build` |
| Output | default Next.js (`.next`) |

## Runbook manual (tu execuți — agentul nu face login/deploy)

1. Creează cont pe [vercel.com](https://vercel.com) (Hobby).
2. **Add New… → Project** → Import repository Git (GitHub/GitLab/Bitbucket).
3. Root Directory: lasă **.** ; Framework: Next.js; Node **20**.
4. Install Command: `pnpm install` (sau lasă default).
5. Build Command: `pnpm --filter @auto-platform/web build`.
6. Environment Variables (Production + Preview): lista de mai sus — **tu** lipești valorile reale din Supabase / seed.
7. După primul deploy: în Project → Domains / Deployment găsești URL-ul `*.vercel.app`.
8. Verifică: catalog pe apex, login `/login`, dashboard, galerie, filtre, rezervări; lead public **dezactivat** dacă ai setat flag-ul.
9. Oprește demo: Project Settings → Pause / Remove Project, sau șterge `HOBBY_DEMO_*` + redeploy; opțional **Deployment Protection** off.

### Limitări Hobby demo

- Un singur Host (fără `acme.` / `beta.` pe internet).
- Fără custom domain / wildcard pe planul gratuit țintă.
- Email noop; cron off; rate-limit in-memory.
- Nu e producție multi-tenant.

## Contracte neschimbate (E5–E11)

- Tenancy Host-based local/producție;
- RLS / schema / DTO publice;
- fără `service_role` pe path-uri user (doar semnare storage server-side existentă);
- fără tenant din client.

## Verificare locală (înainte de deploy)

```bash
pnpm --filter @auto-platform/web test
pnpm --filter @auto-platform/web lint
pnpm typecheck
pnpm --filter @auto-platform/web build
pnpm db:test
```

## Fișiere cheie

- `apps/web/src/lib/tenant/vercel-demo-only.ts`
- `apps/web/src/lib/tenant/get-current-tenant.ts`
- `apps/web/src/lib/storefront/resolve-public-tenant.ts`
- `apps/web/src/lib/storefront/create-public-lead.ts`
- `.env.example`
- `apps/web/src/lib/tenant/__tests__/vercel-demo-only.test.ts`
