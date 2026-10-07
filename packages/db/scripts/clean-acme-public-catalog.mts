/**
 * Etapa 18 — CLI: clean ACME public catalog (idempotent).
 *
 * From repo root:
 *   pnpm db:clean-acme-catalog
 *
 * Or from packages/db:
 *   pnpm clean-acme-catalog
 *
 * Requires DATABASE_URL (loaded from apps/web/.env.local etc.).
 * Does not print secrets, UUIDs, or signed URLs.
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createDb } from "../src/client.ts";
import { cleanAcmePublicCatalog } from "../src/demo/clean-acme-public-catalog.ts";

for (const c of ["../../apps/web/.env.local", "../../.env.local", ".env"]) {
  const p = resolve(process.cwd(), c);
  if (existsSync(p)) config({ path: p });
}

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const db = createDb(url);
const result = await cleanAcmePublicCatalog(db);

console.log(`[clean-acme] tenant=${result.tenantSlug}`);
console.log(`[clean-acme] archived count=${result.archivedSlugs.length}`);
for (const slug of result.archivedSlugs) {
  console.log(`  - archived ${slug}`);
}
console.log(`[clean-acme] ensured showcase: ${result.ensuredShowcaseSlugs.join(", ")}`);
console.log(`[clean-acme] available now (${result.availableSlugs.length}):`);
for (const slug of result.availableSlugs) {
  console.log(`  - ${slug}`);
}

process.exit(0);
