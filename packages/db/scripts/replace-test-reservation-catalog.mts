/**
 * One-off: archive leftover "Test Reservation" vehicles from public catalog
 * and upsert three showcase available vehicles for ACME.
 * Does not print ids / connection strings.
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { and, eq, ilike, or } from "drizzle-orm";
import { createDb } from "../src/client.ts";
import { tenants, vehicles } from "../src/schema/index.ts";

for (const c of ["../../apps/web/.env.local", "../../.env.local", ".env"]) {
  const p = resolve(process.cwd(), c);
  if (existsSync(p)) config({ path: p });
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const db = createDb(url);

const showcase = [
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
];

const acme = await db.query.tenants.findFirst({ where: eq(tenants.slug, "acme") });
if (!acme) {
  console.error("ACME tenant not found");
  process.exit(1);
}

const archived = await db
  .update(vehicles)
  .set({ status: "archived", updatedAt: new Date() })
  .where(
    and(
      eq(vehicles.tenantId, acme.id),
      or(
        and(ilike(vehicles.make, "Test"), ilike(vehicles.model, "Reservation")),
        ilike(vehicles.slug, "e11a-res-%"),
        ilike(vehicles.slug, "%test-reservation%"),
      ),
    ),
  )
  .returning({ slug: vehicles.slug, status: vehicles.status });

console.log(`Archived Test Reservation rows: ${archived.length}`);
for (const row of archived) {
  console.log(`  - ${row.slug} → ${row.status}`);
}

let upserted = 0;
for (const car of showcase) {
  const existing = await db.query.vehicles.findFirst({
    where: and(eq(vehicles.tenantId, acme.id), eq(vehicles.slug, car.slug)),
  });

  const payload = {
    status: "available" as const,
    make: car.make,
    model: car.model,
    year: car.year,
    mileage: car.mileage,
    price: car.price,
    currency: "EUR" as const,
    specs: {},
    fuel: car.fuel,
    transmission: car.transmission,
    bodyType: car.bodyType,
    driveType: car.driveType,
    condition: "used" as const,
    emissionStandard: "euro_6" as const,
    vatRegime: "included" as const,
    accidentStatus: "none" as const,
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
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(vehicles).set(payload).where(eq(vehicles.id, existing.id));
  } else {
    await db.insert(vehicles).values({
      tenantId: acme.id,
      slug: car.slug,
      ...payload,
    });
  }
  upserted += 1;
  console.log(`Upserted available: ${car.make} ${car.model}`);
}

const available = await db
  .select({
    make: vehicles.make,
    model: vehicles.model,
    slug: vehicles.slug,
    status: vehicles.status,
  })
  .from(vehicles)
  .where(and(eq(vehicles.tenantId, acme.id), eq(vehicles.status, "available")));

console.log(`Done. Showcase upserted=${upserted}. ACME available now=${available.length}:`);
for (const row of available) {
  console.log(`  - ${row.make} ${row.model} (${row.slug})`);
}

process.exit(0);
