"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { InsufficientRoleError, assertTenantAccess } from "@auto-platform/core";
import {
  getDb,
  vehicles,
  withTenantContext,
  writeAuditLog,
} from "@auto-platform/db";
import { requireRole } from "@/lib/auth/require-role";
import { vehicleEditPath } from "@/lib/dashboard/nav";
import { VEHICLE_MUTATION_ROLES } from "@/lib/vehicles/permissions";
import {
  parseUpdateVehicleForm,
  parseVehicleId,
  rejectTenantIdFromForm,
} from "@/lib/vehicles/parse-update-form";

export type UpdateVehicleState = {
  error: string | null;
};

/**
 * Updates vehicle fields for the Host tenant only.
 * Never trusts tenant_id or foreign vehicle ownership from the client.
 */
export async function updateVehicleAction(
  _prev: UpdateVehicleState | null,
  formData: FormData,
): Promise<UpdateVehicleState> {
  const tenantError = rejectTenantIdFromForm(formData);
  if (tenantError) return { error: tenantError };

  let session;
  try {
    session = await requireRole(VEHICLE_MUTATION_ROLES);
  } catch (error) {
    if (error instanceof InsufficientRoleError) {
      return { error: "Rolul tău nu permite editarea vehiculelor." };
    }
    throw error;
  }

  const idParsed = parseVehicleId(formData.get("vehicleId"));
  if (!idParsed.ok) return { error: idParsed.error };

  const parsed = parseUpdateVehicleForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;
  const { make, model, year, mileage, price, currency, slug } = parsed.data;

  try {
    await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
      const existing = await db.query.vehicles.findFirst({
        where: and(eq(vehicles.id, idParsed.id), eq(vehicles.tenantId, tenantId)),
      });
      if (!existing) {
        throw new Error("NOT_FOUND");
      }
      assertTenantAccess(tenantId, existing.tenantId);

      const updatedRows = await db
        .update(vehicles)
        .set({
          make,
          model,
          year,
          mileage,
          price,
          currency,
          slug,
          updatedAt: new Date(),
        })
        .where(and(eq(vehicles.id, idParsed.id), eq(vehicles.tenantId, tenantId)))
        .returning({ id: vehicles.id, tenantId: vehicles.tenantId });

      const updated = updatedRows[0];
      if (!updated) {
        throw new Error("NOT_FOUND");
      }
      assertTenantAccess(tenantId, updated.tenantId);

      await writeAuditLog(db, {
        tenantId,
        actorProfileId: profileId,
        action: "vehicle.update",
        entityType: "vehicle",
        entityId: updated.id,
        metadata: {
          make,
          model,
          year,
          slug,
          currency,
          previousSlug: existing.slug,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return { error: "Vehiculul nu există pe acest dealer." };
    }
    if (isUniqueViolation(error)) {
      return { error: "Slug-ul este deja folosit pe acest dealer." };
    }
    return { error: "Actualizarea a eșuat. Încearcă din nou." };
  }

  redirect(vehicleEditPath(idParsed.id, { saved: "1" }));
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code) : "";
  if (code === "23505") return true;
  const message = "message" in error ? String((error as { message?: unknown }).message) : "";
  return /duplicate key|unique constraint/i.test(message);
}
