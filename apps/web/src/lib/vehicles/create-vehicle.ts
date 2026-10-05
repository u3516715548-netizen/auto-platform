"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import {
  InsufficientRoleError,
  buildVehicleSlug,
  withSlugSuffix,
} from "@auto-platform/core";
import {
  getDb,
  vehicles,
  withTenantContext,
  writeAuditLog,
} from "@auto-platform/db";
import { requireRole } from "@/lib/auth/require-role";
import { vehiclesPath } from "@/lib/dashboard/nav";
import { VEHICLE_MUTATION_ROLES } from "@/lib/vehicles/permissions";
import {
  formAttemptsTenantId,
  parseCreateVehicleForm,
} from "@/lib/vehicles/parse-create-form";

export type CreateVehicleState = {
  error: string | null;
};

/**
 * Creates a vehicle for the current Host tenant.
 * tenant_id is taken only from verified membership — never from FormData.
 */
export async function createVehicleAction(
  _prev: CreateVehicleState | null,
  formData: FormData,
): Promise<CreateVehicleState> {
  if (formAttemptsTenantId(formData)) {
    return { error: "Cerere invalidă: tenantul nu poate fi trimis din client." };
  }

  let session;
  try {
    session = await requireRole(VEHICLE_MUTATION_ROLES);
  } catch (error) {
    if (error instanceof InsufficientRoleError) {
      return { error: "Rolul tău nu permite crearea de vehicule." };
    }
    throw error;
  }

  const parsed = parseCreateVehicleForm(formData);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const { make, model, year, mileage, price, currency } = parsed.data;
  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;
  const baseSlug = parsed.data.slug?.trim() || buildVehicleSlug(make, model, year);

  try {
    await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
      let created:
        | {
            id: string;
            slug: string;
          }
        | undefined;

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const slug = withSlugSuffix(baseSlug, attempt);
        try {
          const [row] = await db
            .insert(vehicles)
            .values({
              tenantId,
              status: "draft",
              slug,
              make,
              model,
              year,
              mileage,
              price,
              currency,
              specs: {},
            })
            .returning({ id: vehicles.id, slug: vehicles.slug });

          created = row;
          break;
        } catch (error) {
          if (!isUniqueViolation(error)) {
            throw error;
          }
        }
      }

      if (!created) {
        throw new Error("SLUG_COLLISION");
      }

      // Defense in depth: confirm row belongs to session tenant.
      const verified = await db.query.vehicles.findFirst({
        where: and(eq(vehicles.id, created.id), eq(vehicles.tenantId, tenantId)),
      });
      if (!verified) {
        throw new Error("TENANT_MISMATCH");
      }

      await writeAuditLog(db, {
        tenantId,
        actorProfileId: profileId,
        action: "vehicle.create",
        entityType: "vehicle",
        entityId: created.id,
        metadata: {
          slug: created.slug,
          make,
          model,
          year,
          currency,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SLUG_COLLISION") {
      return { error: "Nu am putut genera un slug unic. Încearcă un slug personalizat." };
    }
    return { error: "Crearea vehiculului a eșuat. Încearcă din nou." };
  }

  redirect(vehiclesPath());
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code) : "";
  if (code === "23505") return true;
  const message = "message" in error ? String((error as { message?: unknown }).message) : "";
  return /duplicate key|unique constraint/i.test(message);
}
