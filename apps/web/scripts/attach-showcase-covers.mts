/**
 * One-off: attach local demo cover images to ACME showcase vehicles in Storage + vehicle_media.
 * Does not print secrets, tokens, or UUIDs.
 */
import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { and, eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { createDb, vehicleMedia, vehicles, tenants } from "@auto-platform/db";

for (const c of [".env.local", "../../.env.local", ".env"]) {
  const p = resolve(process.cwd(), c);
  if (existsSync(p)) config({ path: p });
}

const SHOWCASE = [
  {
    slug: "maserati-granturismo",
    file: "maserati-granturismo.jpg",
    alt: "Maserati GranTurismo",
  },
  {
    slug: "audi-rs6",
    file: "audi-rs6.jpg",
    alt: "Audi RS 6",
  },
  {
    slug: "koenigsegg-ccx",
    file: "koenigsegg-ccx.jpg",
    alt: "Koenigsegg CCX",
  },
] as const;

const databaseUrl = process.env.DATABASE_URL?.trim();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const bucket = process.env.NEXT_PUBLIC_MEDIA_BUCKET?.trim() || "vehicle-media";

if (!databaseUrl || !supabaseUrl || !serviceKey) {
  console.error("Missing DATABASE_URL / Supabase URL / service role (check .env.local).");
  process.exit(1);
}

const db = createDb(databaseUrl);
const storage = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const acme = await db.query.tenants.findFirst({ where: eq(tenants.slug, "acme") });
if (!acme) {
  console.error("ACME tenant not found");
  process.exit(1);
}

const demoDir = resolve(process.cwd(), "public/demo-vehicles");

for (const item of SHOWCASE) {
  const filePath = resolve(demoDir, item.file);
  if (!existsSync(filePath)) {
    console.error(`Missing local file for ${item.slug}`);
    process.exit(1);
  }

  const bytes = readFileSync(filePath);
  if (bytes.length < 3 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    console.error(`Not a JPEG: ${item.file}`);
    process.exit(1);
  }

  const vehicle = await db.query.vehicles.findFirst({
    where: and(eq(vehicles.tenantId, acme.id), eq(vehicles.slug, item.slug)),
  });
  if (!vehicle) {
    console.error(`Vehicle not found: ${item.slug}`);
    process.exit(1);
  }

  const existing = await db
    .select({ id: vehicleMedia.id, storagePath: vehicleMedia.storagePath })
    .from(vehicleMedia)
    .where(
      and(eq(vehicleMedia.tenantId, acme.id), eq(vehicleMedia.vehicleId, vehicle.id)),
    );

  if (existing.length > 0) {
    const paths = existing.map((r) => r.storagePath);
    const { error: removeError } = await storage.storage.from(bucket).remove(paths);
    if (removeError) {
      console.error(`Storage cleanup failed for ${item.slug}: ${removeError.message}`);
      process.exit(1);
    }
    await db
      .delete(vehicleMedia)
      .where(
        and(eq(vehicleMedia.tenantId, acme.id), eq(vehicleMedia.vehicleId, vehicle.id)),
      );
  }

  const mediaId = randomUUID();
  const storagePath = `${acme.id}/${vehicle.id}/${mediaId}.jpg`;

  const { error: uploadError } = await storage.storage.from(bucket).upload(storagePath, bytes, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (uploadError) {
    console.error(`Upload failed for ${item.slug}: ${uploadError.message}`);
    process.exit(1);
  }

  await db.insert(vehicleMedia).values({
    id: mediaId,
    tenantId: acme.id,
    vehicleId: vehicle.id,
    storagePath,
    type: "image",
    sortOrder: 0,
    altText: item.alt,
  });

  console.log(`OK cover attached: ${item.alt} (${item.slug})`);
}

console.log("Done. Showcase covers are in Storage + vehicle_media.");
process.exit(0);
