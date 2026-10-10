"use server";

import { revalidatePath } from "next/cache";
import { revalidatePublicStorefrontPaths } from "@/lib/perf/public-storefront-cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { InsufficientRoleError } from "@auto-platform/core";
import { getDb, tenants, withTenantContext, writeAuditLog } from "@auto-platform/db";
import { requireRole } from "@/lib/auth/require-role";
import { SETTINGS_OWNER_ROLES } from "@/lib/dashboard/settings-nav";
import { rejectTenantIdFromForm } from "@/lib/vehicles/parse-update-form";

export type UpdateCompanyNameState = {
  error: string | null;
  success: boolean;
};

const nameSchema = z
  .string()
  .trim()
  .min(2, "Numele comercial trebuie să aibă cel puțin 2 caractere.")
  .max(120, "Numele comercial este prea lung.");

/**
 * Updates `tenants.name` for the Host tenant only (owner).
 * Other company fields require a future migration — not accepted here.
 */
export async function updateCompanyNameAction(
  _prev: UpdateCompanyNameState | null,
  formData: FormData,
): Promise<UpdateCompanyNameState> {
  const tenantError = rejectTenantIdFromForm(formData);
  if (tenantError) {
    return { error: tenantError, success: false };
  }

  let session;
  try {
    session = await requireRole(SETTINGS_OWNER_ROLES);
  } catch (error) {
    if (error instanceof InsufficientRoleError) {
      return {
        error: "Rolul tău nu permite modificarea detaliilor firmei.",
        success: false,
      };
    }
    throw error;
  }

  const parsed = nameSchema.safeParse(String(formData.get("commercialName") ?? ""));
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Nume invalid.",
      success: false,
    };
  }

  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  try {
    await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
      const existing = await db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId),
        columns: { id: true, name: true },
      });
      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      if (existing.name === parsed.data) {
        return;
      }

      await db
        .update(tenants)
        .set({ name: parsed.data, updatedAt: new Date() })
        .where(eq(tenants.id, tenantId));

      await writeAuditLog(db, {
        tenantId,
        actorProfileId: profileId,
        action: "tenant.name.update",
        entityType: "tenant",
        entityId: tenantId,
        metadata: { from: existing.name, to: parsed.data },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return { error: "Dealerul nu a fost găsit.", success: false };
    }
    return {
      error: "Detaliile firmei nu au putut fi salvate. Încearcă din nou.",
      success: false,
    };
  }

  revalidatePath("/dashboard/settings/company");
  revalidatePath("/dashboard", "layout");
  revalidatePublicStorefrontPaths({ tenantId });

  return { error: null, success: true };
}
