"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import {
  InsufficientRoleError,
  LEAD_ASSIGNABLE_ROLES,
  assertTenantAccess,
} from "@auto-platform/core";
import {
  getDb,
  leads,
  memberships,
  withTenantContext,
  writeAuditLog,
} from "@auto-platform/db";
import { requireRole } from "@/lib/auth/require-role";
import { leadDetailPath } from "@/lib/dashboard/nav";
import { LEAD_MUTATION_ROLES } from "@/lib/leads/permissions";
import {
  parseAssignLeadForm,
  rejectTenantIdFromLeadForm,
} from "@/lib/leads/parse-lead-form";

export type AssignLeadState = {
  error: string | null;
};

/**
 * Assigns / unassigns a lead. Assignee must be an eligible membership on the same tenant.
 */
export async function assignLeadAction(
  _prev: AssignLeadState | null,
  formData: FormData,
): Promise<AssignLeadState> {
  const tenantError = rejectTenantIdFromLeadForm(formData);
  if (tenantError) return { error: tenantError };

  let session;
  try {
    session = await requireRole(LEAD_MUTATION_ROLES);
  } catch (error) {
    if (error instanceof InsufficientRoleError) {
      return { error: "Rolul tău nu permite atribuirea lead-urilor." };
    }
    throw error;
  }

  const parsed = parseAssignLeadForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;
  const leadId = parsed.data.leadId;
  const nextAssignee = parsed.data.assignedTo;

  try {
    await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
      const existing = await db.query.leads.findFirst({
        where: and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)),
      });
      if (!existing) {
        throw new Error("NOT_FOUND");
      }
      assertTenantAccess(tenantId, existing.tenantId);

      if (nextAssignee) {
        const [member] = await db
          .select({
            profileId: memberships.profileId,
            tenantId: memberships.tenantId,
            role: memberships.role,
          })
          .from(memberships)
          .where(
            and(
              eq(memberships.tenantId, tenantId),
              eq(memberships.profileId, nextAssignee),
              inArray(memberships.role, [...LEAD_ASSIGNABLE_ROLES]),
            ),
          )
          .limit(1);

        if (!member || member.tenantId !== tenantId) {
          throw new Error("INVALID_ASSIGNEE");
        }
      }

      if (existing.assignedTo === nextAssignee) {
        return;
      }

      const updatedRows = await db
        .update(leads)
        .set({
          assignedTo: nextAssignee,
          updatedAt: new Date(),
        })
        .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)))
        .returning({
          id: leads.id,
          tenantId: leads.tenantId,
          assignedTo: leads.assignedTo,
        });

      const updated = updatedRows[0];
      if (!updated) {
        throw new Error("NOT_FOUND");
      }
      assertTenantAccess(tenantId, updated.tenantId);

      await writeAuditLog(db, {
        tenantId,
        actorProfileId: profileId,
        action: "lead.assignment.update",
        entityType: "lead",
        entityId: updated.id,
        metadata: {
          fromProfileId: existing.assignedTo,
          toProfileId: updated.assignedTo,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return { error: "Solicitarea nu există pe acest dealer." };
    }
    if (error instanceof Error && error.message === "INVALID_ASSIGNEE") {
      return { error: "Membrul selectat nu poate primi lead-uri pe acest dealer." };
    }
    return { error: "Atribuirea a eșuat. Încearcă din nou." };
  }

  revalidatePath("/dashboard/leads");
  revalidatePath(leadDetailPath(leadId));
  revalidatePath("/dashboard", "layout");
  redirect(leadDetailPath(leadId, { assigned: "1" }));
}
