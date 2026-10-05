import { and, desc, eq } from "drizzle-orm";
import { getDb, vehicles } from "@auto-platform/db";
import { clearPublicSessionGucs } from "./clear-public-session";
import { filterPublicSpecs } from "./public-dto";

export type PublicVehicleDto = {
  slug: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  price: string;
  currency: string;
  specs: Record<string, string | number | boolean>;
};

/**
 * Lists publicly available vehicles for a tenant.
 * Uses anon RLS context (no staff profile GUC) + explicit tenantId filter.
 */
export async function listPublicVehicles(tenantId: string): Promise<PublicVehicleDto[]> {
  const db = getDb();
  await clearPublicSessionGucs(db);

  const rows = await db
    .select({
      slug: vehicles.slug,
      make: vehicles.make,
      model: vehicles.model,
      year: vehicles.year,
      mileage: vehicles.mileage,
      price: vehicles.price,
      currency: vehicles.currency,
      specs: vehicles.specs,
      tenantId: vehicles.tenantId,
      status: vehicles.status,
    })
    .from(vehicles)
    .where(and(eq(vehicles.tenantId, tenantId), eq(vehicles.status, "available")))
    .orderBy(desc(vehicles.createdAt));

  return rows
    .filter((row) => row.tenantId === tenantId && row.status === "available")
    .map((row) => toPublicVehicleDto(row));
}

/**
 * Loads one publicly available vehicle by slug for the Host tenant.
 * Returns null when missing, wrong tenant, or not available.
 */
export async function getPublicVehicleBySlug(
  tenantId: string,
  slug: string,
): Promise<PublicVehicleDto | null> {
  const db = getDb();
  await clearPublicSessionGucs(db);

  const [row] = await db
    .select({
      slug: vehicles.slug,
      make: vehicles.make,
      model: vehicles.model,
      year: vehicles.year,
      mileage: vehicles.mileage,
      price: vehicles.price,
      currency: vehicles.currency,
      specs: vehicles.specs,
      tenantId: vehicles.tenantId,
      status: vehicles.status,
      id: vehicles.id,
    })
    .from(vehicles)
    .where(
      and(
        eq(vehicles.tenantId, tenantId),
        eq(vehicles.slug, slug),
        eq(vehicles.status, "available"),
      ),
    )
    .limit(1);

  if (!row || row.tenantId !== tenantId || row.status !== "available") {
    return null;
  }

  return toPublicVehicleDto(row);
}

/** Server-only: resolve vehicle id for lead attribution (never expose to client DTO). */
export async function getPublicVehicleIdForLead(
  tenantId: string,
  slug: string,
): Promise<string | null> {
  const db = getDb();
  await clearPublicSessionGucs(db);

  const [row] = await db
    .select({
      id: vehicles.id,
      tenantId: vehicles.tenantId,
      status: vehicles.status,
    })
    .from(vehicles)
    .where(
      and(
        eq(vehicles.tenantId, tenantId),
        eq(vehicles.slug, slug),
        eq(vehicles.status, "available"),
      ),
    )
    .limit(1);

  if (!row || row.tenantId !== tenantId || row.status !== "available") {
    return null;
  }
  return row.id;
}

function toPublicVehicleDto(row: {
  slug: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  price: string;
  currency: string;
  specs: unknown;
}): PublicVehicleDto {
  return {
    slug: row.slug,
    make: row.make,
    model: row.model,
    year: row.year,
    mileage: row.mileage,
    price: row.price,
    currency: row.currency,
    specs: filterPublicSpecs(row.specs),
  };
}
