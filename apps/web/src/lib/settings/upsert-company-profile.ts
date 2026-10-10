"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { InsufficientRoleError } from "@auto-platform/core";
import {
  getDb,
  tenantCompanyProfiles,
  tenants,
  withTenantContext,
  writeAuditLog,
} from "@auto-platform/db";
import {
  upsertCompanyProfileInputSchema,
  type UpsertCompanyProfileInput,
} from "@auto-platform/types";
import { requireRole } from "@/lib/auth/require-role";
import { SETTINGS_OWNER_ROLES } from "@/lib/dashboard/settings-nav";
import { rejectTenantIdFromForm } from "@/lib/vehicles/parse-update-form";

export type UpsertCompanyProfileState = {
  error: string | null;
  success: boolean;
};

function formString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "");
}

function parseBusinessHoursFromForm(formData: FormData): UpsertCompanyProfileInput["businessHours"] {
  const note = formString(formData, "hoursNote").trim();
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  const hours: NonNullable<UpsertCompanyProfileInput["businessHours"]> = {};
  let any = false;

  for (const day of days) {
    const closed = formData.get(`hours_${day}_closed`) === "on";
    const open = formString(formData, `hours_${day}_open`).trim();
    const close = formString(formData, `hours_${day}_close`).trim();
    if (closed || (!open && !close)) {
      hours[day] = null;
      continue;
    }
    hours[day] = { open, close };
    any = true;
  }

  if (note) {
    hours.note = note;
    any = true;
  }

  return any ? hours : {};
}

function parseUpsertForm(formData: FormData) {
  return upsertCompanyProfileInputSchema.safeParse({
    tradingName: formString(formData, "tradingName"),
    legalName: formString(formData, "legalName"),
    taxId: formString(formData, "taxId"),
    registrationNumber: formString(formData, "registrationNumber"),
    entityType: formString(formData, "entityType") || undefined,
    publicEmail: formString(formData, "publicEmail"),
    publicPhone: formString(formData, "publicPhone"),
    website: formString(formData, "website"),
    registeredAddress: formString(formData, "registeredAddress"),
    showroomAddress: formString(formData, "showroomAddress"),
    city: formString(formData, "city"),
    county: formString(formData, "county"),
    country: formString(formData, "country") || "RO",
    postalCode: formString(formData, "postalCode"),
    businessHours: parseBusinessHoursFromForm(formData),
    logoPath: formString(formData, "logoPath"),
    faviconPath: formString(formData, "faviconPath"),
    currency: formString(formData, "currency") || "EUR",
  });
}

/** Audit-safe changed keys — never logs full CUI or contact payloads. */
function listChangedKeys(
  existing: typeof tenantCompanyProfiles.$inferSelect | undefined,
  next: UpsertCompanyProfileInput & { tradingName: string },
): string[] {
  const keys: string[] = [];
  const compare = (
    key: string,
    before: unknown,
    after: unknown,
  ) => {
    const a = before ?? null;
    const b = after ?? null;
    if (JSON.stringify(a) !== JSON.stringify(b)) keys.push(key);
  };

  compare("tradingName", existing?.tradingName, next.tradingName);
  compare("legalName", existing?.legalName, next.legalName ?? null);
  compare("taxIdSet", Boolean(existing?.taxId), Boolean(next.taxId));
  compare(
    "registrationNumberSet",
    Boolean(existing?.registrationNumber),
    Boolean(next.registrationNumber),
  );
  compare("entityType", existing?.entityType, next.entityType ?? null);
  compare("publicEmailSet", Boolean(existing?.publicEmail), Boolean(next.publicEmail));
  compare("publicPhoneSet", Boolean(existing?.publicPhone), Boolean(next.publicPhone));
  compare("websiteSet", Boolean(existing?.website), Boolean(next.website));
  compare("registeredAddress", existing?.registeredAddress, next.registeredAddress ?? null);
  compare("showroomAddress", existing?.showroomAddress, next.showroomAddress ?? null);
  compare("city", existing?.city, next.city ?? null);
  compare("county", existing?.county, next.county ?? null);
  compare("country", existing?.country, next.country ?? null);
  compare("postalCode", existing?.postalCode, next.postalCode ?? null);
  compare("businessHours", existing?.businessHours ?? {}, next.businessHours ?? {});
  compare("logoPathSet", Boolean(existing?.logoPath), Boolean(next.logoPath));
  compare("faviconPathSet", Boolean(existing?.faviconPath), Boolean(next.faviconPath));
  compare("currency", existing?.currency, next.currency ?? existing?.currency ?? "EUR");
  return keys;
}

/**
 * Owner-only upsert of tenant_company_profiles + sync tenants.name from tradingName.
 * Tenant id comes from Host session only.
 */
export async function upsertCompanyProfileAction(
  _prev: UpsertCompanyProfileState | null,
  formData: FormData,
): Promise<UpsertCompanyProfileState> {
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

  const parsed = parseUpsertForm(formData);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Date invalide.",
      success: false,
    };
  }

  const input = parsed.data;
  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  try {
    await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
      const existing = await db.query.tenantCompanyProfiles.findFirst({
        where: eq(tenantCompanyProfiles.tenantId, tenantId),
      });

      const now = new Date();
      const rowValues = {
        legalName: input.legalName ?? null,
        tradingName: input.tradingName,
        taxId: input.taxId ?? null,
        registrationNumber: input.registrationNumber ?? null,
        entityType: input.entityType ?? null,
        publicEmail: input.publicEmail ?? null,
        publicPhone: input.publicPhone ?? null,
        website: input.website ?? null,
        registeredAddress: input.registeredAddress ?? null,
        showroomAddress: input.showroomAddress ?? null,
        city: input.city ?? null,
        county: input.county ?? null,
        country: input.country ?? "RO",
        postalCode: input.postalCode ?? null,
        businessHours: input.businessHours ?? {},
        logoPath: input.logoPath ?? null,
        faviconPath: input.faviconPath ?? null,
        currency: input.currency ?? "EUR",
        updatedAt: now,
      };

      const changedKeys = listChangedKeys(existing, input);

      if (!existing) {
        await db.insert(tenantCompanyProfiles).values({
          tenantId,
          ...rowValues,
          createdAt: now,
        });
        await writeAuditLog(db, {
          tenantId,
          actorProfileId: profileId,
          action: "company.profile.create",
          entityType: "tenant_company_profile",
          entityId: tenantId,
          metadata: { changedKeys },
        });
      } else if (changedKeys.length > 0) {
        await db
          .update(tenantCompanyProfiles)
          .set(rowValues)
          .where(eq(tenantCompanyProfiles.tenantId, tenantId));
        await writeAuditLog(db, {
          tenantId,
          actorProfileId: profileId,
          action: "company.profile.update",
          entityType: "tenant_company_profile",
          entityId: tenantId,
          metadata: { changedKeys },
        });
      }

      const tenantRow = await db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId),
        columns: { id: true, name: true },
      });
      if (tenantRow && tenantRow.name !== input.tradingName) {
        await db
          .update(tenants)
          .set({ name: input.tradingName, updatedAt: now })
          .where(eq(tenants.id, tenantId));
        await writeAuditLog(db, {
          tenantId,
          actorProfileId: profileId,
          action: "tenant.name.update",
          entityType: "tenant",
          entityId: tenantId,
          metadata: { from: tenantRow.name, to: input.tradingName },
        });
      }
    });
  } catch {
    return {
      error: "Detaliile firmei nu au putut fi salvate. Încearcă din nou.",
      success: false,
    };
  }

  revalidatePath("/dashboard/settings/company");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/");
  revalidatePath("/vehicles", "layout");

  return { error: null, success: true };
}
