/**
 * Dev seed: two tenants for cross-tenant isolation checks.
 *
 * Requires in apps/web/.env.local:
 *   DATABASE_URL
 *   SEED_PROFILE_A_ID  — real auth.users UUID
 *   SEED_PROFILE_B_ID  — real auth.users UUID
 *
 * Usage:
 *   pnpm --filter @auto-platform/db seed
 */

import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { createDb } from "../client";
import { writeAuditLog } from "../audit";
import { memberships } from "../schema/memberships";
import { profiles } from "../schema/profiles";
import { tenants } from "../schema/tenants";
import { vehicles } from "../schema/vehicles";

for (const candidate of [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), ".env.local"),
  resolve(process.cwd(), "../../.env"),
  resolve(process.cwd(), "../../.env.local"),
  resolve(process.cwd(), "../../apps/web/.env.local"),
]) {
  if (existsSync(candidate)) loadEnv({ path: candidate });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SeedProfileIds = {
  profileA: string;
  profileB: string;
};

/**
 * Reads SEED_PROFILE_A_ID / SEED_PROFILE_B_ID from env.
 * Never logs the UUID values.
 */
export function resolveSeedProfileIds(): SeedProfileIds {
  const rawA = process.env.SEED_PROFILE_A_ID?.trim();
  const rawB = process.env.SEED_PROFILE_B_ID?.trim();

  if (!rawA || !rawB) {
    throw new Error(
      "[seed] Missing SEED_PROFILE_A_ID and/or SEED_PROFILE_B_ID. " +
        "Create two users in Supabase Auth, copy their UUIDs into apps/web/.env.local, then re-run seed.",
    );
  }

  if (!UUID_RE.test(rawA) || !UUID_RE.test(rawB)) {
    throw new Error(
      "[seed] SEED_PROFILE_A_ID and SEED_PROFILE_B_ID must be valid UUIDs " +
        "(format xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx). Fix apps/web/.env.local and re-run.",
    );
  }

  if (rawA.toLowerCase() === rawB.toLowerCase()) {
    throw new Error(
      "[seed] SEED_PROFILE_A_ID and SEED_PROFILE_B_ID must be two different Auth user UUIDs.",
    );
  }

  return { profileA: rawA, profileB: rawB };
}

export async function seedDevTenants(connectionString: string) {
  const { profileA, profileB } = resolveSeedProfileIds();
  const db = createDb(connectionString);

  await db
    .insert(tenants)
    .values({
      name: "ACME Motors",
      slug: "acme",
      status: "active",
      plan: "starter",
      branding: { primaryColor: "#0f766e" },
    })
    .onConflictDoNothing({ target: tenants.slug });

  await db
    .insert(tenants)
    .values({
      name: "Beta Autos",
      slug: "beta",
      status: "active",
      plan: "starter",
      branding: { primaryColor: "#1d4ed8" },
    })
    .onConflictDoNothing({ target: tenants.slug });

  const existingA = await db.query.tenants.findFirst({ where: eq(tenants.slug, "acme") });
  const existingB = await db.query.tenants.findFirst({ where: eq(tenants.slug, "beta") });

  if (!existingA || !existingB) {
    throw new Error("Failed to resolve seeded tenants acme/beta");
  }

  await db
    .insert(profiles)
    .values([
      { id: profileA, name: "Alice Acme", email: "alice@acme.test" },
      { id: profileB, name: "Bob Beta", email: "bob@beta.test" },
    ])
    .onConflictDoNothing({ target: profiles.id });

  await db
    .insert(memberships)
    .values([
      { tenantId: existingA.id, profileId: profileA, role: "owner" },
      { tenantId: existingB.id, profileId: profileB, role: "owner" },
    ])
    .onConflictDoNothing({ target: [memberships.tenantId, memberships.profileId] });

  await db
    .insert(vehicles)
    .values({
      tenantId: existingA.id,
      status: "available",
      slug: "golf-8-acme",
      make: "Volkswagen",
      model: "Golf",
      year: 2022,
      mileage: 25000,
      price: "18990.00",
      currency: "EUR",
      specs: { fuel: "diesel" },
    })
    .onConflictDoNothing({ target: [vehicles.tenantId, vehicles.slug] });

  await db
    .insert(vehicles)
    .values({
      tenantId: existingB.id,
      status: "available",
      slug: "focus-beta",
      make: "Ford",
      model: "Focus",
      year: 2021,
      mileage: 40000,
      price: "14990.00",
      currency: "EUR",
      specs: { fuel: "petrol" },
    })
    .onConflictDoNothing({ target: [vehicles.tenantId, vehicles.slug] });

  const vehicleA = await db.query.vehicles.findFirst({
    where: eq(vehicles.slug, "golf-8-acme"),
  });
  const vehicleB = await db.query.vehicles.findFirst({
    where: eq(vehicles.slug, "focus-beta"),
  });

  await writeAuditLog(db, {
    tenantId: existingA.id,
    actorProfileId: profileA,
    action: "seed.dev_tenants",
    entityType: "tenant",
    entityId: existingA.id,
    metadata: { note: "dev seed" },
  });

  return {
    tenantA: existingA,
    tenantB: existingB,
    profileA,
    profileB,
    vehicleA,
    vehicleB,
  };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "[seed] DATABASE_URL missing. Set it in apps/web/.env.local, run migrations, then re-run seed.",
    );
    process.exitCode = 1;
    return;
  }

  try {
    resolveSeedProfileIds();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
    return;
  }

  const result = await seedDevTenants(url);
  console.warn("[seed] OK", {
    tenantA: result.tenantA.slug,
    tenantB: result.tenantB.slug,
    profiles: "bound to SEED_PROFILE_A_ID / SEED_PROFILE_B_ID",
  });
  process.exit(0);
}

const entry = process.argv[1]?.replaceAll("\\", "/") ?? "";
if (entry.endsWith("/seed/dev-tenants.ts") || entry.endsWith("/seed/dev-tenants.js")) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    // Avoid dumping full connection details; keep constraint name if present.
    console.error("[seed] failed", message);
    process.exit(1);
  });
}
