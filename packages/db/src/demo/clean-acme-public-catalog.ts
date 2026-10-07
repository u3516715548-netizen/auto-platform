/**
 * Etapa 18 — idempotent ACME public catalog cleanup.
 * Archives approved test / coverless demo vehicles; ensures showcase stays available.
 * Never prints UUIDs, connection strings, or secrets.
 */
import { and, eq, ilike, inArray, or } from "drizzle-orm";
import type { Database } from "../client";
import { tenants, vehicles } from "../schema";

/** Public showcase vehicles for ACME (must remain available). */
export const ACME_SHOWCASE_SLUGS = [
  "koenigsegg-ccx",
  "audi-rs6",
  "maserati-granturismo",
] as const;

/** Seed Golf — keep row, but not public without cover. */
export const ACME_GOLF_SLUG = "golf-8-acme";

export type CleanAcmePublicCatalogResult = {
  tenantSlug: "acme";
  archivedSlugs: string[];
  ensuredShowcaseSlugs: string[];
  availableSlugs: string[];
};

/**
 * Soft-archives ACME public pollution (Test Reservation + Golf) and
 * ensures the three showcase vehicles are `available`.
 * Idempotent; ACME-only; no Storage deletes; no hard-delete.
 */
export async function cleanAcmePublicCatalog(
  db: Database,
): Promise<CleanAcmePublicCatalogResult> {
  const acme = await db.query.tenants.findFirst({
    where: eq(tenants.slug, "acme"),
    columns: { id: true, slug: true },
  });
  if (!acme) {
    throw new Error("ACME tenant not found");
  }

  const archived = await db
    .update(vehicles)
    .set({ status: "archived", updatedAt: new Date() })
    .where(
      and(
        eq(vehicles.tenantId, acme.id),
        eq(vehicles.status, "available"),
        or(
          and(ilike(vehicles.make, "Test"), ilike(vehicles.model, "Reservation")),
          ilike(vehicles.slug, "e11a-res-%"),
          ilike(vehicles.slug, "%test-reservation%"),
          eq(vehicles.slug, ACME_GOLF_SLUG),
        ),
      ),
    )
    .returning({ slug: vehicles.slug });

  const archivedSlugs = archived.map((r) => r.slug).filter(Boolean) as string[];

  await db
    .update(vehicles)
    .set({ status: "available", updatedAt: new Date() })
    .where(
      and(
        eq(vehicles.tenantId, acme.id),
        inArray(vehicles.slug, [...ACME_SHOWCASE_SLUGS]),
      ),
    );

  const available = await db
    .select({ slug: vehicles.slug })
    .from(vehicles)
    .where(and(eq(vehicles.tenantId, acme.id), eq(vehicles.status, "available")))
    .orderBy(vehicles.slug);

  return {
    tenantSlug: "acme",
    archivedSlugs,
    ensuredShowcaseSlugs: [...ACME_SHOWCASE_SLUGS],
    availableSlugs: available.map((r) => r.slug!).filter(Boolean),
  };
}
