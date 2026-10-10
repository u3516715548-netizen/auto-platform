# Handoff — Etapa 24: Template 2 activ (MVP CSS/tokens)

## Meta
- Data: 10 octombrie 2026
- Workspace: `C:\Users\Wolf\dev\aplicatie-masini`
- Branch: `master` (lucru local, necomis)
- Bază: Etapa 23A.2 (`eccaab5` / cache middleware SSR)
- Status: implementată local; **gata pentru commit separat**; **fără** commit / push / deploy până la aprobare
- Documente citite:
  - `docs/handoffs/README.md`
  - `docs/handoffs/23a2-production-performance-cache-middleware-ssr.md`
  - `docs/handoffs/audit-9-octombrie-2026.md`

## Obiectiv

Activează Template 2 pe storefront-ul live ca **MVP CSS/tokens dark** pe aceeași structură de layout ca Template 1 — fără componente noi, fără schimbări de carduri/nav/detaliu/lead/finance/CMS/SEO.

## Scope aprobat

- `template-2` în `STOREFRONT_TEMPLATE_IDS` + Zod
- Registry: T2 `status: "ready"`; T1 neschimbat
- `resolveStorefrontTemplateId("template-2")` → T2; invalid → T1
- Apply branding: owner OK, non-owner deny, audit, `revalidatePublicStorefrontPaths`
- CSS `.storefront-template-2` dark tokens (+ remap utilitare light hardcodate)
- Preview T2 rămâne DEMO izolat
- Copy RO: „Activarea folosește datele reale ale dealerului”
- Teste registry / Zod / preview / apply / live / fallback / regresie 23A.2

## Ce nu intră în scope

- Structură layout / componente noi T2
- Modificări carduri, navigație, detaliu, lead, finance, CMS, SEO
- DB / Supabase / Storage / RLS / `.env.local` / deployment / Vercel CLI
- Modificări middleware Auth public, Data Cache sau TTL 30s din 23A.2
- Commit / push / deploy

## Decizie MVP

Template 2 = **doar CSS/tokens dark**. Apply pe tenant live folosește inventarul real; Preview rămâne DEMO.

## Fișiere principale

| Zonă | Fișiere |
|------|---------|
| Allowlist Zod | `packages/types/src/index.ts` |
| Registry | `apps/web/src/lib/storefront/templates/registry.ts` |
| CSS | `apps/web/src/app/globals.css` |
| Apply (neschimbat logic, doar comentariu) | `apps/web/src/lib/tenant/apply-storefront-template.ts` |
| Copy UI | `theme-gallery.tsx`, `apply-theme-confirm.tsx` |
| Teste | `etapa9a-branding`, `theme-preview-isolation`, `apply-storefront-template` |

## Verificări

```text
pnpm db:test
pnpm typecheck
pnpm --filter @auto-platform/web test
pnpm --filter @auto-platform/web build
```

Așteptat: DB 90 passed; web 298+; typecheck OK; build OK.

### Smoke local (10 octombrie 2026)

Dev server pe `:3000` (restart necesar o dată — hung după smoke Invoke-WebRequest anterior).

| Check | Rezultat |
|-------|----------|
| ACME `/`, detail, `/compara`, `/salvate` implicit | `template-1` |
| Beta `/` | `template-1` |
| Golf `/vehicles/golf-8-acme` | **404** |
| Apply T2 (owner Alice) | status „Tema a fost activată”; live ACME `data-storefront-template="template-2"` + inventar real (Koenigsegg), fără Demo Motors |
| Beta după apply ACME | rămâne `template-1` |
| Preview T2 | Demo Motors + „Preview demo izolat — fără date reale, fără scriere…” |
| Revert T1 după smoke | ACME din nou `template-1` |

## Riscuri rămase

- Unele clase Tailwind hardcodate (ex. `hover:bg-zinc-50`) pot rămâne imperfecte pe dark fără remap complet.
- Overlay Next.js semnalează hydration mismatch pe pagina Teme (preexistent / non-blocking la apply).
- Documentele istorice (`audit-9-octombrie`, `HANDOFF_Status_*`) încă menționează T2 `coming_soon` (nu rescrise în această etapă).

## Commit propus (doar după aprobare)

```text
feat(storefront): activate Template 2 as dark CSS tokens MVP

Make template-2 ready and Zod-selectable so owners can apply the dark
token shell on live inventory without changing Template 1 layout.
```
