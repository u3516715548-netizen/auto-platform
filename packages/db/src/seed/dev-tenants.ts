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
import { and, eq, inArray } from "drizzle-orm";
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
      branding: {
        primaryColor: "#0f766e",
        templateId: "template-1",
        phone: "+40700001001",
        whatsapp: "+40700001001",
      },
    })
    .onConflictDoNothing({ target: tenants.slug });

  await db
    .insert(tenants)
    .values({
      name: "Beta Autos",
      slug: "beta",
      status: "active",
      plan: "starter",
      branding: {
        primaryColor: "#1d4ed8",
        templateId: "template-1",
        phone: "+40700002002",
        whatsapp: "+40700002002",
      },
    })
    .onConflictDoNothing({ target: tenants.slug });

  const existingA = await db.query.tenants.findFirst({ where: eq(tenants.slug, "acme") });
  const existingB = await db.query.tenants.findFirst({ where: eq(tenants.slug, "beta") });

  if (!existingA || !existingB) {
    throw new Error("Failed to resolve seeded tenants acme/beta");
  }

  // Keep Template 1 branding fields current for re-seeds (no migration).
  await db
    .update(tenants)
    .set({
      branding: {
        primaryColor: "#0f766e",
        templateId: "template-1",
        phone: "+40700001001",
        whatsapp: "+40700001001",
      },
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, existingA.id));

  await db
    .update(tenants)
    .set({
      branding: {
        primaryColor: "#1d4ed8",
        templateId: "template-1",
        phone: "+40700002002",
        whatsapp: "+40700002002",
      },
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, existingB.id));

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

  // Golf stays in seed for isolation / publish-field fixtures, but is NOT public
  // until a cover exists (Etapa 18). Status archived — reactivate when cover is attached.
  // "Test Reservation" / e11a-res-* vehicles are NOT seeded; they come only from online tests
  // (those suites must teardown / archive them — see cleanAcmePublicCatalog).
  await db
    .insert(vehicles)
    .values({
      tenantId: existingA.id,
      status: "archived",
      slug: "golf-8-acme",
      make: "Volkswagen",
      model: "Golf",
      year: 2022,
      mileage: 25000,
      price: "18990.00",
      currency: "EUR",
      specs: {},
      fuel: "diesel",
      transmission: "manual",
      bodyType: "hatchback",
      driveType: "fwd",
      condition: "used",
      emissionStandard: "euro_6d",
      vatRegime: "deductible",
      accidentStatus: "none",
      powerHp: 150,
      engineDisplacementCc: 1968,
      doors: 5,
      seats: 5,
      exteriorColor: "Gri metalizat",
      interiorColor: "Negru",
      firstRegistrationYear: 2022,
      firstRegistrationMonth: 3,
      priceNegotiable: true,
      originCountry: "DE",
      locationCity: "București",
      warrantyMonths: 12,
      warrantyNotes: "Garanție dealer 12 luni",
      hasServiceBook: true,
      hasServiceHistory: true,
      description:
        "Volkswagen Golf 8 din 2022, motor diesel, stare foarte bună, carte de service la zi. Ideal pentru oraș și drumuri lungi.",
      features: ["abs", "esp", "ac", "nav", "parking_sensors", "carplay"],
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
      specs: {},
      fuel: "petrol",
      transmission: "manual",
      bodyType: "hatchback",
      driveType: "fwd",
      condition: "used",
      emissionStandard: "euro_6d",
      vatRegime: "included",
      accidentStatus: "none",
      powerHp: 125,
      engineDisplacementCc: 999,
      doors: 5,
      seats: 5,
      exteriorColor: "Albastru",
      interiorColor: "Gri",
      firstRegistrationYear: 2021,
      firstRegistrationMonth: 6,
      priceNegotiable: false,
      originCountry: "RO",
      locationCity: "Cluj-Napoca",
      warrantyMonths: 6,
      warrantyNotes: null,
      hasServiceBook: true,
      hasServiceHistory: false,
      description:
        "Ford Focus 2021, benzină, întreținut, fără accidente declarate. Potrivit pentru familie și navetă zilnică.",
      features: ["abs", "airbag", "ac", "android_auto"],
    })
    .onConflictDoNothing({ target: [vehicles.tenantId, vehicles.slug] });

  // Showcase available vehicles (full public fields; covers optional via media upload).
  for (const car of [
    {
      slug: "maserati-granturismo",
      make: "Maserati",
      model: "GranTurismo",
      year: 2022,
      mileage: 15000,
      price: "90000.00",
      fuel: "petrol" as const,
      transmission: "automatic" as const,
      bodyType: "coupe" as const,
      driveType: "rwd" as const,
      powerHp: 450,
      engineDisplacementCc: 2990,
      doors: 2,
      seats: 4,
      exteriorColor: "Alb perlat",
      description:
        "Maserati GranTurismo elegant, finisaj alb perlat, motor puternic și habitaclu premium.",
      features: [
        "abs",
        "esp",
        "airbag",
        "climate_auto",
        "leather",
        "heated_seats",
        "nav",
        "parking_camera",
        "led_lights",
        "keyless",
      ],
    },
    {
      slug: "audi-rs6",
      make: "Audi",
      model: "RS 6",
      year: 2023,
      mileage: 22000,
      price: "78500.00",
      fuel: "petrol" as const,
      transmission: "automatic" as const,
      bodyType: "sedan" as const,
      driveType: "awd" as const,
      powerHp: 600,
      engineDisplacementCc: 3996,
      doors: 4,
      seats: 5,
      exteriorColor: "Albastru metalizat",
      description:
        "Audi RS 6 sportiv, tracțiune integrală, faruri LED Matrix și jante performante.",
      features: [
        "abs",
        "esp",
        "airbag",
        "climate_auto",
        "leather",
        "adaptive_cruise",
        "parking_sensors",
        "parking_camera",
        "android_auto",
        "carplay",
        "led_lights",
      ],
    },
    {
      slug: "koenigsegg-ccx",
      make: "Koenigsegg",
      model: "CCX",
      year: 2021,
      mileage: 8000,
      price: "185000.00",
      fuel: "petrol" as const,
      transmission: "automatic" as const,
      bodyType: "coupe" as const,
      driveType: "rwd" as const,
      powerHp: 800,
      engineDisplacementCc: 4700,
      doors: 2,
      seats: 2,
      exteriorColor: "Roșu metalizat",
      description:
        "Hypercar în roșu metalizat, aerodinamică agresivă și performanțe extreme.",
      features: [
        "abs",
        "esp",
        "airbag",
        "climate_auto",
        "leather",
        "nav",
        "led_lights",
        "keyless",
        "sunroof",
      ],
    },
  ]) {
    await db
      .insert(vehicles)
      .values({
        tenantId: existingA.id,
        status: "available",
        slug: car.slug,
        make: car.make,
        model: car.model,
        year: car.year,
        mileage: car.mileage,
        price: car.price,
        currency: "EUR",
        specs: {},
        fuel: car.fuel,
        transmission: car.transmission,
        bodyType: car.bodyType,
        driveType: car.driveType,
        condition: "used",
        emissionStandard: "euro_6",
        vatRegime: "included",
        accidentStatus: "none",
        powerHp: car.powerHp,
        engineDisplacementCc: car.engineDisplacementCc,
        doors: car.doors,
        seats: car.seats,
        exteriorColor: car.exteriorColor,
        interiorColor: "Negru",
        firstRegistrationYear: car.year,
        firstRegistrationMonth: 6,
        priceNegotiable: false,
        originCountry: "RO",
        locationCity: "București",
        warrantyMonths: 12,
        warrantyNotes: "Garanție dealer 12 luni",
        hasServiceBook: true,
        hasServiceHistory: true,
        description: car.description,
        features: car.features,
      })
      .onConflictDoNothing({ target: [vehicles.tenantId, vehicles.slug] });
  }

  // Draft incomplete — for publish-gate tests (missing fuel/transmission/etc.).
  await db
    .insert(vehicles)
    .values({
      tenantId: existingA.id,
      status: "draft",
      slug: "draft-incomplet-acme",
      make: "Dacia",
      model: "Logan",
      year: 2019,
      mileage: 80000,
      price: "7990.00",
      currency: "EUR",
      specs: {},
      features: [],
    })
    .onConflictDoNothing({ target: [vehicles.tenantId, vehicles.slug] });

  // Idempotent: keep Golf publish fields complete, but archived (no public card without cover).
  await db
    .update(vehicles)
    .set({
      status: "archived",
      fuel: "diesel",
      transmission: "manual",
      bodyType: "hatchback",
      driveType: "fwd",
      condition: "used",
      emissionStandard: "euro_6d",
      vatRegime: "deductible",
      accidentStatus: "none",
      powerHp: 150,
      engineDisplacementCc: 1968,
      doors: 5,
      seats: 5,
      exteriorColor: "Gri metalizat",
      interiorColor: "Negru",
      firstRegistrationYear: 2022,
      firstRegistrationMonth: 3,
      priceNegotiable: true,
      originCountry: "DE",
      locationCity: "București",
      warrantyMonths: 12,
      warrantyNotes: "Garanție dealer 12 luni",
      hasServiceBook: true,
      hasServiceHistory: true,
      description:
        "Volkswagen Golf 8 din 2022, motor diesel, stare foarte bună, carte de service la zi. Ideal pentru oraș și drumuri lungi.",
      features: ["abs", "esp", "ac", "nav", "parking_sensors", "carplay"],
      specs: {},
      updatedAt: new Date(),
    })
    .where(eq(vehicles.slug, "golf-8-acme"));

  // Showcase cars must stay publicly available (covers attached separately via offline script).
  await db
    .update(vehicles)
    .set({ status: "available", updatedAt: new Date() })
    .where(
      and(
        eq(vehicles.tenantId, existingA.id),
        inArray(vehicles.slug, [
          "koenigsegg-ccx",
          "audi-rs6",
          "maserati-granturismo",
        ]),
      ),
    );

  await db
    .update(vehicles)
    .set({
      status: "available",
      fuel: "petrol",
      transmission: "manual",
      bodyType: "hatchback",
      driveType: "fwd",
      condition: "used",
      emissionStandard: "euro_6d",
      vatRegime: "included",
      accidentStatus: "none",
      powerHp: 125,
      engineDisplacementCc: 999,
      doors: 5,
      seats: 5,
      exteriorColor: "Albastru",
      interiorColor: "Gri",
      firstRegistrationYear: 2021,
      firstRegistrationMonth: 6,
      priceNegotiable: false,
      originCountry: "RO",
      locationCity: "Cluj-Napoca",
      warrantyMonths: 6,
      hasServiceBook: true,
      hasServiceHistory: false,
      description:
        "Ford Focus 2021, benzină, întreținut, fără accidente declarate. Potrivit pentru familie și navetă zilnică.",
      features: ["abs", "airbag", "ac", "android_auto"],
      specs: {},
      updatedAt: new Date(),
    })
    .where(eq(vehicles.slug, "focus-beta"));

  const vehicleA = await db.query.vehicles.findFirst({
    where: eq(vehicles.slug, "golf-8-acme"),
  });
  const vehicleB = await db.query.vehicles.findFirst({
    where: eq(vehicles.slug, "focus-beta"),
  });
  const vehicleDraft = await db.query.vehicles.findFirst({
    where: eq(vehicles.slug, "draft-incomplet-acme"),
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
    vehicleDraft,
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
