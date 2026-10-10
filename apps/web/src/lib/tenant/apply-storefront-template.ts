"use server";

import { revalidatePath } from "next/cache";
import { revalidatePublicStorefrontPaths } from "@/lib/perf/public-storefront-cache";
import { eq } from "drizzle-orm";
import { InsufficientRoleError } from "@auto-platform/core";
import { storefrontTemplateIdSchema } from "@auto-platform/types";
import { getDb, tenants, withTenantContext, writeAuditLog } from "@auto-platform/db";
import { requireRole } from "@/lib/auth/require-role";
import {
  BRANDING_UPDATE_ROLES,
  listChangedBrandingKeys,
  mergeTenantBranding,
} from "@/lib/tenant/branding-merge";
import { parsePublicBranding } from "@/lib/storefront/public-dto";
import { parseLeadNotificationEmails } from "@/lib/tenant/parse-lead-notification-emails";
import { isStorefrontTemplateReady } from "@/lib/storefront/templates/registry";
import { rejectTenantIdFromForm } from "@/lib/vehicles/parse-update-form";

export type ApplyStorefrontTemplateState = {
  error: string | null;
  success: boolean;
};

/**
 * Persists only `branding.templateId` for the Host tenant (owner).
 * Rejects coming_soon / unknown IDs — Zod allowlist is template-1 only.
 */
export async function applyStorefrontTemplateAction(
  _prev: ApplyStorefrontTemplateState | null,
  formData: FormData,
): Promise<ApplyStorefrontTemplateState> {
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
        error: "Rolul tău nu permite schimbarea temei.",
        success: false,
      };
    }
    throw error;
  }

  const rawId = String(formData.get("templateId") ?? "");
  if (!isStorefrontTemplateReady(rawId)) {
    return {
      error: "Această temă este în pregătire și nu poate fi activată încă.",
      success: false,
    };
  }

  const idParsed = storefrontTemplateIdSchema.safeParse(rawId);
  if (!idParsed.success) {
    return {
      error: "Tema selectată nu poate fi salvată.",
      success: false,
    };
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

      const publicFields = parsePublicBranding(existing.branding);
      const nextBranding = mergeTenantBranding(existing.branding, {
        primaryColor: publicFields.primaryColor,
        templateId: idParsed.data,
        phone: publicFields.phone ?? null,
        whatsapp: publicFields.whatsapp ?? null,
        leadNotificationEmails: parseLeadNotificationEmails(existing.branding),
      });
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
          metadata: { changedKeys, templateId: idParsed.data },
        });
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return { error: "Dealerul nu a fost găsit.", success: false };
    }
    return {
      error: "Tema nu a putut fi salvată. Încearcă din nou.",
      success: false,
    };
  }

  revalidatePath("/dashboard/settings/customization/themes");
  revalidatePath("/dashboard/settings/customization/preferences");
  revalidatePath("/dashboard/settings/company");
  revalidatePublicStorefrontPaths({ tenantId });

  return { error: null, success: true };
}
