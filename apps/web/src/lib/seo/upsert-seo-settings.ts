"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { InsufficientRoleError } from "@auto-platform/core";
import {
  getDb,
  tenantSeoSettings,
  withTenantContext,
  writeAuditLog,
} from "@auto-platform/db";
import { upsertTenantSeoSettingsInputSchema } from "@auto-platform/types";
import { requireRole } from "@/lib/auth/require-role";
import { SETTINGS_OWNER_ROLES } from "@/lib/dashboard/settings-nav";
import { rejectTenantIdFromForm } from "@/lib/vehicles/parse-update-form";

export type UpsertSeoSettingsState = {
  error: string | null;
  success: boolean;
};

export async function upsertSeoSettingsAction(
  _prev: UpsertSeoSettingsState | null,
  formData: FormData,
): Promise<UpsertSeoSettingsState> {
  if (rejectTenantIdFromForm(formData)) {
    return { error: "Setările SEO nu au putut fi salvate.", success: false };
  }

  let session;
  try {
    session = await requireRole(SETTINGS_OWNER_ROLES);
  } catch (error) {
    if (error instanceof InsufficientRoleError) {
      return {
        error: "Rolul tău nu permite modificarea setărilor SEO.",
        success: false,
      };
    }
    throw error;
  }

  // Unchecked checkbox omits the field — treat missing as false.
  const indexingRaw = String(formData.get("indexingEnabled") ?? "");
  const parsed = upsertTenantSeoSettingsInputSchema.safeParse({
    seoTitleDefault: String(formData.get("seoTitleDefault") ?? ""),
    seoDescriptionDefault: String(formData.get("seoDescriptionDefault") ?? ""),
    faviconPath: String(formData.get("faviconPath") ?? ""),
    indexingEnabled: indexingRaw === "on" || indexingRaw === "true" || indexingRaw === "1",
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Date SEO invalide.",
      success: false,
    };
  }

  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;
  const input = parsed.data;
  const now = new Date();

  try {
    await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
      const existing = await db.query.tenantSeoSettings.findFirst({
        where: eq(tenantSeoSettings.tenantId, tenantId),
      });

      const values = {
        seoTitleDefault: input.seoTitleDefault,
        seoDescriptionDefault: input.seoDescriptionDefault,
        faviconPath: input.faviconPath,
        indexingEnabled: input.indexingEnabled,
        updatedAt: now,
      };

      if (!existing) {
        await db.insert(tenantSeoSettings).values({
          tenantId,
          ...values,
          createdAt: now,
        });
        await writeAuditLog(db, {
          tenantId,
          actorProfileId: profileId,
          action: "seo.settings.create",
          entityType: "tenant_seo_settings",
          entityId: tenantId,
          metadata: {
            changedKeys: ["seoTitleDefault", "seoDescriptionDefault", "faviconPath", "indexingEnabled"],
            indexingEnabled: input.indexingEnabled,
          },
        });
      } else {
        await db
          .update(tenantSeoSettings)
          .set(values)
          .where(eq(tenantSeoSettings.tenantId, tenantId));
        await writeAuditLog(db, {
          tenantId,
          actorProfileId: profileId,
          action: "seo.settings.update",
          entityType: "tenant_seo_settings",
          entityId: tenantId,
          metadata: {
            changedKeys: ["seoTitleDefault", "seoDescriptionDefault", "faviconPath", "indexingEnabled"],
            indexingEnabled: input.indexingEnabled,
          },
        });
      }
    });
  } catch {
    return { error: "Setările SEO nu au putut fi salvate.", success: false };
  }

  revalidatePath("/dashboard/settings/customization/preferences");
  revalidatePath("/");
  revalidatePath("/vehicles", "layout");
  revalidatePath("/p", "layout");

  return { error: null, success: true };
}
