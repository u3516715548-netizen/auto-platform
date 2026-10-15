"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { InsufficientRoleError } from "@auto-platform/core";
import {
  getDb,
  tenantMarketingIntegrations,
  withTenantContext,
  writeAuditLog,
} from "@auto-platform/db";
import { upsertTenantMarketingIntegrationsInputSchema } from "@auto-platform/types";
import { requireRole } from "@/lib/auth/require-role";
import { SETTINGS_OWNER_ROLES } from "@/lib/dashboard/settings-nav";
import { rejectTenantIdFromForm } from "@/lib/vehicles/parse-update-form";

export type UpsertMarketingIntegrationsState = {
  error: string | null;
  success: boolean;
};

function readBool(formData: FormData, name: string): boolean {
  const raw = String(formData.get(name) ?? "");
  return raw === "on" || raw === "true" || raw === "1";
}

/**
 * Owner-only upsert for marketing integration IDs.
 * Never trusts client tenant_id. Does not load scripts on storefront.
 */
export async function upsertMarketingIntegrationsAction(
  _prev: UpsertMarketingIntegrationsState | null,
  formData: FormData,
): Promise<UpsertMarketingIntegrationsState> {
  if (rejectTenantIdFromForm(formData)) {
    return { error: "Integrările de marketing nu au putut fi salvate.", success: false };
  }

  let session;
  try {
    session = await requireRole(SETTINGS_OWNER_ROLES);
  } catch (error) {
    if (error instanceof InsufficientRoleError) {
      return {
        error: "Rolul tău nu permite modificarea integrărilor de marketing.",
        success: false,
      };
    }
    throw error;
  }

  const parsed = upsertTenantMarketingIntegrationsInputSchema.safeParse({
    gtmContainerId: String(formData.get("gtmContainerId") ?? ""),
    gtmEnabled: readBool(formData, "gtmEnabled"),
    ga4MeasurementId: String(formData.get("ga4MeasurementId") ?? ""),
    ga4Enabled: readBool(formData, "ga4Enabled"),
    googleAdsConversionId: String(formData.get("googleAdsConversionId") ?? ""),
    googleAdsConversionLabel: String(formData.get("googleAdsConversionLabel") ?? ""),
    googleAdsEnabled: readBool(formData, "googleAdsEnabled"),
    metaPixelId: String(formData.get("metaPixelId") ?? ""),
    metaPixelEnabled: readBool(formData, "metaPixelEnabled"),
    tiktokPixelId: String(formData.get("tiktokPixelId") ?? ""),
    tiktokPixelEnabled: readBool(formData, "tiktokPixelEnabled"),
    linkedinPartnerId: String(formData.get("linkedinPartnerId") ?? ""),
    linkedinEnabled: readBool(formData, "linkedinEnabled"),
    googleSearchConsoleVerification: String(
      formData.get("googleSearchConsoleVerification") ?? "",
    ),
    bingWebmasterVerification: String(formData.get("bingWebmasterVerification") ?? ""),
    metaDomainVerification: String(formData.get("metaDomainVerification") ?? ""),
    pinterestVerification: String(formData.get("pinterestVerification") ?? ""),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Date marketing invalide.",
      success: false,
    };
  }

  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;
  const input = parsed.data;
  const now = new Date();

  const configuredKeys = (
    [
      ["gtmContainerId", input.gtmContainerId],
      ["ga4MeasurementId", input.ga4MeasurementId],
      ["googleAdsConversionId", input.googleAdsConversionId],
      ["metaPixelId", input.metaPixelId],
      ["tiktokPixelId", input.tiktokPixelId],
      ["linkedinPartnerId", input.linkedinPartnerId],
      ["googleSearchConsoleVerification", input.googleSearchConsoleVerification],
      ["bingWebmasterVerification", input.bingWebmasterVerification],
      ["metaDomainVerification", input.metaDomainVerification],
      ["pinterestVerification", input.pinterestVerification],
    ] as const
  )
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key);

  try {
    await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
      const existing = await db.query.tenantMarketingIntegrations.findFirst({
        where: eq(tenantMarketingIntegrations.tenantId, tenantId),
      });

      const values = {
        ...input,
        updatedAt: now,
      };

      if (!existing) {
        await db.insert(tenantMarketingIntegrations).values({
          tenantId,
          ...values,
          createdAt: now,
        });
        await writeAuditLog(db, {
          tenantId,
          actorProfileId: profileId,
          action: "marketing.integrations.create",
          entityType: "tenant_marketing_integrations",
          entityId: tenantId,
          metadata: {
            configuredKeys,
            // Never log raw ID values.
          },
        });
      } else {
        await db
          .update(tenantMarketingIntegrations)
          .set(values)
          .where(eq(tenantMarketingIntegrations.tenantId, tenantId));
        await writeAuditLog(db, {
          tenantId,
          actorProfileId: profileId,
          action: "marketing.integrations.update",
          entityType: "tenant_marketing_integrations",
          entityId: tenantId,
          metadata: {
            configuredKeys,
          },
        });
      }
    });
  } catch {
    return { error: "Integrările de marketing nu au putut fi salvate.", success: false };
  }

  revalidatePath("/dashboard/settings/marketing");
  revalidatePath("/dashboard/settings/marketing/analytics");
  revalidatePath("/dashboard/settings/marketing/verification");

  return { error: null, success: true };
}
