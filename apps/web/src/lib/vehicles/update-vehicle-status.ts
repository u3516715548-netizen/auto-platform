"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { InsufficientRoleError, assertTenantAccess } from "@auto-platform/core";
import {
  getDb,
  vehicles,
  withTenantContext,
  writeAuditLog,
} from "@auto-platform/db";
import { assessVehiclePublishReady } from "@auto-platform/types";
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
  missingFields?: string[];
};

/**
 * Changes vehicle status for the Host tenant only.
 * Transition to `available` requires Etapa 6 publish fields.
 * Revalidates dashboard + public catalog so reserved/sold disappear from storefront.
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
  let vehicleSlug: string | null = null;

  try {
    const gateResult = await withTenantContext(
      getDb(),
      { profileId, tenantId },
      async (db) => {
        const existing = await db.query.vehicles.findFirst({
          where: and(eq(vehicles.id, idParsed.id), eq(vehicles.tenantId, tenantId)),
        });
        if (!existing) {
          throw new Error("NOT_FOUND");
        }
        assertTenantAccess(tenantId, existing.tenantId);
        vehicleSlug = existing.slug;

        if (existing.status === nextStatus) {
          return { kind: "noop" as const };
        }

        if (nextStatus === "available") {
          const readiness = assessVehiclePublishReady({
            make: existing.make,
            model: existing.model,
            year: existing.year,
            mileage: existing.mileage,
            price: existing.price,
            fuel: existing.fuel,
            transmission: existing.transmission,
            bodyType: existing.bodyType,
            condition: existing.condition,
            powerHp: existing.powerHp,
            description: existing.description,
            vatRegime: existing.vatRegime,
          });
          if (!readiness.ok) {
            return {
              kind: "blocked" as const,
              missingLabels: readiness.missingLabels,
            };
          }
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

        return { kind: "ok" as const };
      },
    );

    if (gateResult.kind === "blocked") {
      return {
        error: `Nu poți seta statusul „Disponibil”. Completează: ${gateResult.missingLabels.join(", ")}.`,
        missingFields: gateResult.missingLabels,
      };
    }
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return { error: "Vehiculul nu există pe acest dealer." };
    }
    return { error: "Schimbarea statusului a eșuat. Încearcă din nou." };
  }

  revalidatePath(vehicleEditPath(idParsed.id));
  revalidatePath("/dashboard/vehicles");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/vehicles", "layout");
  if (vehicleSlug) {
    revalidatePath(`/vehicles/${vehicleSlug}`);
  }

  redirect(vehicleEditPath(idParsed.id, { status: "1" }));
}
