import {
  InsufficientRoleError,
  hasAnyRole,
  hasMinimumRole,
  type MembershipContext,
} from "@auto-platform/core";
import type { MembershipRole } from "@auto-platform/types";
import { requireMembership, type MembershipSession } from "./require-membership";

/**
 * Requires membership (from host tenant) plus one of the allowed roles.
 */
export async function requireRole(
  allowedRoles: readonly MembershipRole[],
): Promise<MembershipSession> {
  const session = await requireMembership();
  assertRoleAllowed(session.membership, allowedRoles);
  return session;
}

/**
 * Requires membership with at least `minimum` role in the hierarchy
 * owner > manager > sales > viewer.
 */
export async function requireMinimumRole(minimum: MembershipRole): Promise<MembershipSession> {
  const session = await requireMembership();
  if (!hasMinimumRole(session.membership.role, minimum)) {
    throw new InsufficientRoleError();
  }
  return session;
}

export function assertRoleAllowed(
  membership: MembershipContext,
  allowedRoles: readonly MembershipRole[],
): void {
  if (!hasAnyRole(membership.role, allowedRoles)) {
    throw new InsufficientRoleError();
  }
}
