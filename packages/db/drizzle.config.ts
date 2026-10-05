import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Load env from common locations without inventing secrets.
for (const candidate of [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), ".env.local"),
  resolve(process.cwd(), "../../.env"),
  resolve(process.cwd(), "../../.env.local"),
  resolve(process.cwd(), "../../apps/web/.env.local"),
]) {
  if (existsSync(candidate)) {
    loadEnv({ path: candidate });
  }
}

const databaseUrl =
  process.env.DATABASE_URL_MIGRATIONS ??
  process.env.DATABASE_URL ??
  // Placeholder only for drizzle-kit generate (no live connection required for generate).
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
  migrations: {
    table: "__drizzle_migrations",
    schema: "drizzle",
  },
});
