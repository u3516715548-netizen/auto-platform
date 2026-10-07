/**
 * @deprecated Prefer `pnpm db:clean-acme-catalog` (Etapa 18).
 * Thin wrapper around cleanAcmePublicCatalog for backward compatibility.
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

console.warn(
  "[deprecated] Use: pnpm db:clean-acme-catalog  (this script delegates to the same cleanup)",
);

const result = await cleanAcmePublicCatalog(createDb(url));
console.log(`Archived rows: ${result.archivedSlugs.length}`);
for (const slug of result.archivedSlugs) {
  console.log(`  - ${slug} → archived`);
}
console.log(`ACME available now=${result.availableSlugs.length}:`);
for (const slug of result.availableSlugs) {
  console.log(`  - ${slug}`);
}
process.exit(0);
