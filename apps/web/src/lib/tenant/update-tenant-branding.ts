"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { InsufficientRoleError } from "@auto-platform/core";
import { getDb, tenants, withTenantContext, writeAuditLog } from "@auto-platform/db";
import { requireRole } from "@/lib/auth/require-role";
import { rejectTenantIdFromForm } from "@/lib/vehicles/parse-update-form";
import {
  BRANDING_UPDATE_ROLES,
  listChangedBrandingKeys,
  mergeTenantBranding,
  parseBrandingUpdateForm,
} from "@/lib/tenant/branding-merge";

export type UpdateTenantBrandingState = {
  error: string | null;
  success: boolean;
};

export async function updateTenantBrandingAction(
  _prev: UpdateTenantBrandingState | null,
  formData: FormData,
): Promise<UpdateTenantBrandingState> {
  const tenantError = rejectTenantIdFromForm(formData);
  if (tenantError) {
    return { error: tenantError, success: false };
  }

  let session;
  try {
    session = await requireRole(BRANDING_UPDATE_ROLES);
  } catch (error) {
    if (error instanceof InsufficientRoleError) {
      return {
        error: "Rolul tău nu permite modificarea branding-ului.",
        success: false,
      };
    }
    throw error;
  }

  const parsed = parseBrandingUpdateForm(formData);
  if (!parsed.ok) {
    return { error: parsed.error, success: false };
  }

  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  try {
    await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
      const existing = await db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId),
        columns: { id: true, branding: true },
      });
      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      const nextBranding = mergeTenantBranding(existing.branding, parsed.data);
      const changedKeys = listChangedBrandingKeys(existing.branding, nextBranding);

      await db
        .update(tenants)
        .set({ branding: nextBranding, updatedAt: new Date() })
        .where(eq(tenants.id, tenantId));

      if (changedKeys.length > 0) {
        await writeAuditLog(db, {
          tenantId,
          actorProfileId: profileId,
          action: "tenant.branding.update",
          entityType: "tenant",
          entityId: tenantId,
          metadata: { changedKeys },
        });
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return { error: "Dealerul nu a fost găsit.", success: false };
    }
    return {
      error: "Branding-ul nu a putut fi salvat. Încearcă din nou.",
      success: false,
    };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/");
  revalidatePath("/vehicles", "layout");

  return { error: null, success: true };
}
