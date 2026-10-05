/**
 * Server-side Drizzle client. Never import from browser bundles.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

export type Database = ReturnType<typeof createDb>;
export type DbSchema = typeof schema;

let singleton: Database | null = null;
let singletonSql: ReturnType<typeof postgres> | null = null;

export function createDb(connectionString: string) {
  const client = postgres(connectionString, {
    max: 10,
    prepare: false,
  });

  return drizzle(client, { schema });
}

/** Lazy singleton for server runtimes. Requires DATABASE_URL. */
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Configure Supabase Postgres and add it to .env.local (see .env.example).",
    );
  }

  if (!singleton) {
    singletonSql = postgres(url, { max: 10, prepare: false });
    singleton = drizzle(singletonSql, { schema });
  }

  return singleton;
}

export async function closeDb() {
  if (singletonSql) {
    await singletonSql.end({ timeout: 5 });
    singletonSql = null;
    singleton = null;
  }
}
