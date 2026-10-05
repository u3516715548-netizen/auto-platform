# Etapa 1 — Monorepo foundation

**Status:** finalizată și verificată

## Rezumat

Fondarea monorepo-ului Turborepo + pnpm cu aplicația Next.js, packages partajate, lint, typecheck și build funcționale. Fără Auth UI, fără schema DB completă (acestea vin în Etapa 2+).

## Structură monorepo

```text
apps/web          Next.js App Router (storefront + dashboard ulterior)
apps/mobile       Placeholder Expo
packages/db       Drizzle (extins în Etapa 2)
packages/ui       Primitives UI partajate
packages/config   TS / ESLint partajate
packages/types    Zod schemas + tipuri
packages/core     Module de domeniu (stub-uri inițiale)
docs/             Documentație
```

## Setup și comenzi

```bash
pnpm install
pnpm --filter @auto-platform/web dev
pnpm lint
pnpm typecheck
pnpm --filter @auto-platform/web build
```

Path recomandat pe Windows: NTFS local **fără spații** (ex. `C:\Users\<you>\dev\aplicatie-masini`). Path-urile UNC / mapate cu spații pot rupe postinstall pnpm.

## Rezultate

- Monorepo pornit cu workspace pnpm + Turborepo
- `@auto-platform/web` pe Next.js App Router + Tailwind
- Packages `config`, `types`, `ui`, `core`, `db` legate prin `workspace:*`
- `pnpm lint`, `pnpm typecheck`, build web — OK la finalizarea etapei

## Decizii

- TypeScript strict pe tot monorepo-ul
- Business logic rămâne server-side; packages `core`/`db` nu expun mutații browser→DB
- Mobile rămâne placeholder până la o etapă dedicată
- Documentația de etapă trăiește în `docs/stages/`; handoff-ul principal rămâne scurt
