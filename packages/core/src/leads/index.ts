/**
 * Domain leads — permissions aligned with RLS `leads_update_staff`.
 */

import { hasAnyRole, type MembershipRole } from "../tenancy/index";

export type LeadId = string;

/** Roles allowed to update lead status / assignment (matches RLS). Viewer is read-only. */
export const LEAD_MUTATION_ROLES = ["owner", "manager", "sales"] as const;
export type LeadMutationRole = (typeof LEAD_MUTATION_ROLES)[number];

export function canMutateLead(role: MembershipRole): boolean {
  return hasAnyRole(role, LEAD_MUTATION_ROLES);
}

/** Roles eligible to be assigned a lead (same as mutators). */
export const LEAD_ASSIGNABLE_ROLES = LEAD_MUTATION_ROLES;
