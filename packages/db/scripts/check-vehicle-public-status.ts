import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { and, desc, eq, inArray } from "drizzle-orm";
import { createDb } from "./src/client";
import { reservations, vehicles } from "./src/schema";

for (const c of ["../../apps/web/.env.local", "../../.env.local", ".env"]) {
  const p = resolve(process.cwd(), c);
  if (existsSync(p)) config({ path: p });
}

const db = createDb(process.env.DATABASE_URL!);
const rows = await db
  .select({
    status: vehicles.status,
    slug: vehicles.slug,
    make: vehicles.make,
    model: vehicles.model,
  })
  .from(vehicles)
  .where(inArray(vehicles.status, ["available", "reserved", "sold"]))
  .orderBy(vehicles.status, vehicles.slug);

console.log("--- available / reserved / sold ---");
for (const r of rows) {
  console.log(`${r.status.padEnd(10)} ${r.slug}  ${r.make} ${r.model}`);
}

const active = await db
  .select({
    id: reservations.id,
    status: reservations.status,
    vehicleId: reservations.vehicleId,
  })
  .from(reservations)
  .where(eq(reservations.status, "active"))
  .orderBy(desc(reservations.createdAt));
console.log("--- active reservations ---", active.length);
for (const r of active) console.log(r);

process.exit(0);
