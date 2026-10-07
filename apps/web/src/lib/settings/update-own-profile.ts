"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, profiles, withTenantContext } from "@auto-platform/db";
import { requireMembership } from "@/lib/auth/require-membership";
import { rejectTenantIdFromForm } from "@/lib/vehicles/parse-update-form";

export type UpdateOwnProfileState = {
  error: string | null;
  success: boolean;
};

const nameSchema = z
  .string()
  .trim()
  .min(2, "Numele afișat trebuie să aibă cel puțin 2 caractere.")
  .max(80, "Numele afișat este prea lung.");

/**
 * Updates only the authenticated user's own profile name.
 * Never accepts another profile id or tenant_id from the client.
 */
export async function updateOwnProfileAction(
  _prev: UpdateOwnProfileState | null,
  formData: FormData,
): Promise<UpdateOwnProfileState> {
  const tenantError = rejectTenantIdFromForm(formData);
  if (tenantError) {
    return { error: tenantError, success: false };
  }

  const session = await requireMembership();
  const profileId = session.user.profile.id;
  const tenantId = session.tenant.tenantId;

  const parsed = nameSchema.safeParse(String(formData.get("name") ?? ""));
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Nume invalid.",
      success: false,
    };
  }

  try {
    await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
      const updated = await db
        .update(profiles)
        .set({ name: parsed.data, updatedAt: new Date() })
        .where(eq(profiles.id, profileId))
        .returning({ id: profiles.id });

      if (updated.length === 0) {
        throw new Error("NOT_FOUND");
      }
    });
  } catch {
    return {
      error: "Profilul nu a putut fi salvat. Încearcă din nou.",
      success: false,
    };
  }

  revalidatePath("/dashboard/settings/general");
  revalidatePath("/dashboard", "layout");

  return { error: null, success: true };
}
