import { and, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb, leads, memberships, profiles, vehicles, withTenantContext } from "@auto-platform/db";
import { leadIdSchema, type LeadListFilter, type LeadStatus } from "@auto-platform/types";
import { requireMembership } from "@/lib/auth/require-membership";
import { leadStatusesForFilter } from "@/lib/leads/lead-list-filter";
import { membershipRoleLabel } from "@/lib/dashboard/role-label";
import type { MembershipRole } from "@auto-platform/core";

export type LeadListItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
  createdAt: Date;
  vehicle: { id: string; make: string; model: string } | null;
  assignee: { profileId: string; displayName: string } | null;
};

function assigneeDisplayName(
  profileName: string | null | undefined,
  role: MembershipRole | null | undefined,
): string {
  const trimmed = profileName?.trim();
  if (trimmed) return trimmed;
  if (role) return `Membru · ${membershipRoleLabel(role)}`;
  return "Membru";
}

/**
 * Lists leads for the Host-resolved tenant only. Newest first.
 * Single query with left joins (no N+1). Never accepts tenant_id from client.
 */
export async function listTenantLeads(
  filter: LeadListFilter = "all",
): Promise<LeadListItem[]> {
  const { user, tenant } = await requireMembership();
  const tenantId = tenant.tenantId;
  const profileId = user.profile.id;
  const statusFilter = leadStatusesForFilter(filter);

  const assigneeProfiles = alias(profiles, "lead_assignee_profiles");
  const assigneeMemberships = alias(memberships, "lead_assignee_memberships");

  return withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
    const conditions = [eq(leads.tenantId, tenantId)];
    if (statusFilter) {
      conditions.push(inArray(leads.status, [...statusFilter]));
    }

    const rows = await db
      .select({
        id: leads.id,
        tenantId: leads.tenantId,
        name: leads.name,
        email: leads.email,
        phone: leads.phone,
        status: leads.status,
        createdAt: leads.createdAt,
        assignedTo: leads.assignedTo,
        vehicleId: vehicles.id,
        vehicleMake: vehicles.make,
        vehicleModel: vehicles.model,
        vehicleTenantId: vehicles.tenantId,
        assigneeName: assigneeProfiles.name,
        assigneeRole: assigneeMemberships.role,
      })
      .from(leads)
      .leftJoin(
        vehicles,
        and(eq(vehicles.id, leads.vehicleId), eq(vehicles.tenantId, tenantId)),
      )
      .leftJoin(assigneeProfiles, eq(assigneeProfiles.id, leads.assignedTo))
      .leftJoin(
        assigneeMemberships,
        and(
          eq(assigneeMemberships.profileId, leads.assignedTo),
          eq(assigneeMemberships.tenantId, tenantId),
        ),
      )
      .where(and(...conditions))
      .orderBy(desc(leads.createdAt));

    return rows
      .filter((row) => row.tenantId === tenantId)
      .map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        status: row.status,
        createdAt: row.createdAt,
        vehicle:
          row.vehicleId && row.vehicleTenantId === tenantId
            ? { id: row.vehicleId, make: row.vehicleMake!, model: row.vehicleModel! }
            : null,
        assignee: row.assignedTo
          ? {
              profileId: row.assignedTo,
              displayName: assigneeDisplayName(
                row.assigneeName,
                row.assigneeRole as MembershipRole | null,
              ),
            }
          : null,
      }));
  });
}

export type TenantLeadDetail = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: string;
  status: LeadStatus;
  createdAt: Date;
  updatedAt: Date;
  vehicle: { id: string; make: string; model: string; slug: string } | null;
  assignee: { profileId: string; displayName: string } | null;
};

export type TenantLeadAccess = {
  session: Awaited<ReturnType<typeof requireMembership>>;
  lead: TenantLeadDetail;
};

/**
 * Loads one lead for the Host tenant. Invalid / missing / cross-tenant → null (→ 404).
 */
export async function getTenantLeadById(rawId: string): Promise<TenantLeadAccess | null> {
  const idParsed = leadIdSchema.safeParse(rawId);
  if (!idParsed.success) {
    return null;
  }
  const leadId = idParsed.data;
  const session = await requireMembership();
  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  const assigneeProfiles = alias(profiles, "lead_detail_assignee_profiles");
  const assigneeMemberships = alias(memberships, "lead_detail_assignee_memberships");

  const row = await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
    const [found] = await db
      .select({
        id: leads.id,
        tenantId: leads.tenantId,
        name: leads.name,
        email: leads.email,
        phone: leads.phone,
        message: leads.message,
        source: leads.source,
        status: leads.status,
        createdAt: leads.createdAt,
        updatedAt: leads.updatedAt,
        assignedTo: leads.assignedTo,
        vehicleId: vehicles.id,
        vehicleMake: vehicles.make,
        vehicleModel: vehicles.model,
        vehicleSlug: vehicles.slug,
        vehicleTenantId: vehicles.tenantId,
        assigneeName: assigneeProfiles.name,
        assigneeRole: assigneeMemberships.role,
      })
      .from(leads)
      .leftJoin(
        vehicles,
        and(eq(vehicles.id, leads.vehicleId), eq(vehicles.tenantId, tenantId)),
      )
      .leftJoin(assigneeProfiles, eq(assigneeProfiles.id, leads.assignedTo))
      .leftJoin(
        assigneeMemberships,
        and(
          eq(assigneeMemberships.profileId, leads.assignedTo),
          eq(assigneeMemberships.tenantId, tenantId),
        ),
      )
      .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)))
      .limit(1);

    return found ?? null;
  });

  if (!row || row.tenantId !== tenantId) {
    return null;
  }

  return {
    session,
    lead: {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      message: row.message,
      source: row.source,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      vehicle:
        row.vehicleId && row.vehicleTenantId === tenantId
          ? {
              id: row.vehicleId,
              make: row.vehicleMake!,
              model: row.vehicleModel!,
              slug: row.vehicleSlug!,
            }
          : null,
      assignee: row.assignedTo
        ? {
            profileId: row.assignedTo,
            displayName: assigneeDisplayName(
              row.assigneeName,
              row.assigneeRole as MembershipRole | null,
            ),
          }
        : null,
    },
  };
}
