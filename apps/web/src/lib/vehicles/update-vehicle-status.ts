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
  parseUpdateStatusForm,
  parseVehicleId,
  rejectTenantIdFromForm,
} from "@/lib/vehicles/parse-update-form";

export type UpdateVehicleStatusState = {
  error: string | null;
};

/**
 * Changes vehicle status within the existing enum for the Host tenant only.
 */
export async function updateVehicleStatusAction(
  _prev: UpdateVehicleStatusState | null,
  formData: FormData,
): Promise<UpdateVehicleStatusState> {
  const tenantError = rejectTenantIdFromForm(formData);
  if (tenantError) return { error: tenantError };

  let session;
  try {
    session = await requireRole(VEHICLE_MUTATION_ROLES);
  } catch (error) {
    if (error instanceof InsufficientRoleError) {
      return { error: "Rolul tău nu permite schimbarea statusului." };
    }
    throw error;
  }

  const idParsed = parseVehicleId(formData.get("vehicleId"));
  if (!idParsed.ok) return { error: idParsed.error };

  const parsed = parseUpdateStatusForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;
  const nextStatus = parsed.data.status;

  try {
    await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
      const existing = await db.query.vehicles.findFirst({
        where: and(eq(vehicles.id, idParsed.id), eq(vehicles.tenantId, tenantId)),
      });
      if (!existing) {
        throw new Error("NOT_FOUND");
      }
      assertTenantAccess(tenantId, existing.tenantId);

      if (existing.status === nextStatus) {
        return;
      }

      const updatedRows = await db
        .update(vehicles)
        .set({
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(and(eq(vehicles.id, idParsed.id), eq(vehicles.tenantId, tenantId)))
        .returning({ id: vehicles.id, tenantId: vehicles.tenantId, status: vehicles.status });

      const updated = updatedRows[0];
      if (!updated) {
        throw new Error("NOT_FOUND");
      }
      assertTenantAccess(tenantId, updated.tenantId);

      await writeAuditLog(db, {
        tenantId,
        actorProfileId: profileId,
        action: "vehicle.status_change",
        entityType: "vehicle",
        entityId: updated.id,
        metadata: {
          from: existing.status,
          to: updated.status,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return { error: "Vehiculul nu există pe acest dealer." };
    }
    return { error: "Schimbarea statusului a eșuat. Încearcă din nou." };
  }

  redirect(vehicleEditPath(idParsed.id, { status: "1" }));
}
