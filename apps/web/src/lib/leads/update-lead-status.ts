"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { InsufficientRoleError, assertTenantAccess } from "@auto-platform/core";
import { getDb, leads, withTenantContext, writeAuditLog } from "@auto-platform/db";
import type { LeadStatus } from "@auto-platform/types";
import { requireRole } from "@/lib/auth/require-role";
import { leadDetailPath } from "@/lib/dashboard/nav";
import { LEAD_MUTATION_ROLES } from "@/lib/leads/permissions";
import {
  parseUpdateLeadStatusForm,
  rejectTenantIdFromLeadForm,
} from "@/lib/leads/parse-lead-form";

export type UpdateLeadStatusState = {
  error: string | null;
};

/**
 * Updates lead status for the Host tenant only.
 */
export async function updateLeadStatusAction(
  _prev: UpdateLeadStatusState | null,
  formData: FormData,
): Promise<UpdateLeadStatusState> {
  const tenantError = rejectTenantIdFromLeadForm(formData);
  if (tenantError) return { error: tenantError };

  let session;
  try {
    session = await requireRole(LEAD_MUTATION_ROLES);
  } catch (error) {
    if (error instanceof InsufficientRoleError) {
      return { error: "Rolul tău nu permite actualizarea lead-urilor." };
    }
    throw error;
  }

  const parsed = parseUpdateLeadStatusForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;
  const leadId = parsed.data.leadId;
  const nextStatus = parsed.data.status as LeadStatus;

  try {
    await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
      const existing = await db.query.leads.findFirst({
        where: and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)),
      });
      if (!existing) {
        throw new Error("NOT_FOUND");
      }
      assertTenantAccess(tenantId, existing.tenantId);

      if (existing.status === nextStatus) {
        return;
      }

      const updatedRows = await db
        .update(leads)
        .set({
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)))
        .returning({ id: leads.id, tenantId: leads.tenantId, status: leads.status });

      const updated = updatedRows[0];
      if (!updated) {
        throw new Error("NOT_FOUND");
      }
      assertTenantAccess(tenantId, updated.tenantId);

      await writeAuditLog(db, {
        tenantId,
        actorProfileId: profileId,
        action: "lead.status.update",
        entityType: "lead",
        entityId: updated.id,
        metadata: {
          from: existing.status,
          to: updated.status,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return { error: "Solicitarea nu există pe acest dealer." };
    }
    return { error: "Actualizarea statusului a eșuat. Încearcă din nou." };
  }

  revalidatePath("/dashboard/leads");
  revalidatePath(leadDetailPath(leadId));
  revalidatePath("/dashboard", "layout");
  redirect(leadDetailPath(leadId, { status: "1" }));
}
