import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

for (const candidate of [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), ".env.local"),
  resolve(process.cwd(), "../../.env"),
  resolve(process.cwd(), "../../.env.local"),
  resolve(process.cwd(), "../../apps/web/.env.local"),
]) {
  if (existsSync(candidate)) loadEnv({ path: candidate });
}

const url = process.env.DATABASE_URL_MIGRATIONS ?? process.env.DATABASE_URL;
if (!url) {
  console.error(
    "[db:migrate] DATABASE_URL (or DATABASE_URL_MIGRATIONS) is not set.\n" +
      "Create a Supabase project, copy the Postgres connection string into apps/web/.env.local,\n" +
      "then re-run: pnpm db:migrate\n" +
      "SQL files are already generated under packages/db/drizzle/.",
  );
  process.exit(1);
}

const result = spawnSync("pnpm", ["exec", "drizzle-kit", "migrate"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
