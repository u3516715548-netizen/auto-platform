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
import { vehiclesPath } from "@/lib/dashboard/nav";
import { VEHICLE_MUTATION_ROLES } from "@/lib/vehicles/permissions";
import {
  parseVehicleId,
  rejectTenantIdFromForm,
} from "@/lib/vehicles/parse-update-form";

export type ArchiveVehicleState = {
  error: string | null;
};

/**
 * Soft-archives a vehicle (status = archived). No physical delete.
 * Requires explicit confirmation checkbox from the client form.
 */
export async function archiveVehicleAction(
  _prev: ArchiveVehicleState | null,
  formData: FormData,
): Promise<ArchiveVehicleState> {
  const tenantError = rejectTenantIdFromForm(formData);
  if (tenantError) return { error: tenantError };

  const confirmed = formData.get("confirmArchive");
  if (confirmed !== "yes") {
    return { error: "Confirmă arhivarea bifând caseta înainte de a continua." };
  }

  let session;
  try {
    session = await requireRole(VEHICLE_MUTATION_ROLES);
  } catch (error) {
    if (error instanceof InsufficientRoleError) {
      return { error: "Rolul tău nu permite arhivarea vehiculelor." };
    }
    throw error;
  }

  const idParsed = parseVehicleId(formData.get("vehicleId"));
  if (!idParsed.ok) return { error: idParsed.error };

  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  try {
    await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
      const existing = await db.query.vehicles.findFirst({
        where: and(eq(vehicles.id, idParsed.id), eq(vehicles.tenantId, tenantId)),
      });
      if (!existing) {
        throw new Error("NOT_FOUND");
      }
      assertTenantAccess(tenantId, existing.tenantId);

      if (existing.status === "archived") {
        throw new Error("ALREADY_ARCHIVED");
      }

      const updatedRows = await db
        .update(vehicles)
        .set({
          status: "archived",
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
        action: "vehicle.archive",
        entityType: "vehicle",
        entityId: updated.id,
        metadata: {
          from: existing.status,
          to: "archived",
          slug: existing.slug,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return { error: "Vehiculul nu există pe acest dealer." };
    }
    if (error instanceof Error && error.message === "ALREADY_ARCHIVED") {
      return { error: "Vehiculul este deja arhivat." };
    }
    return { error: "Arhivarea a eșuat. Încearcă din nou." };
  }

  redirect(vehiclesPath({ view: "archived", notice: "archived" }));
}
