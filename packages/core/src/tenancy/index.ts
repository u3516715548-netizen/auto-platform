/**
 * Domain tenancy — tipuri, erori, ierarhie roluri.
 * Utilitarele Next.js (cookies, host, DB) trăiesc în apps/web.
 */

/** Aligned with packages/types membershipRoleSchema / DB enum. */
export type MembershipRole = "owner" | "manager" | "sales" | "viewer";

export type TenantContext = {
  tenantId: string;
  slug: string;
};

export type MembershipContext = {
  membershipId: string;
  profileId: string;
  tenantId: string;
  role: MembershipRole;
};

export class TenantAccessError extends Error {
  readonly code = "TENANT_ACCESS_DENIED" as const;

  constructor(message = "Acces interzis pentru acest tenant") {
    super(message);
    this.name = "TenantAccessError";
  }
}

export class TenantResolutionError extends Error {
  readonly code = "TENANT_RESOLUTION_FAILED" as const;

  constructor(message = "Tenantul nu a putut fi rezolvat din host") {
    super(message);
    this.name = "TenantResolutionError";
  }
}

export class AuthRequiredError extends Error {
  readonly code = "AUTH_REQUIRED" as const;

  constructor(message = "Autentificare necesară") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export class MembershipRequiredError extends Error {
  readonly code = "MEMBERSHIP_REQUIRED" as const;

  constructor(message = "Membership necesar pentru acest tenant") {
    super(message);
    this.name = "MembershipRequiredError";
  }
}

export class InsufficientRoleError extends Error {
  readonly code = "INSUFFICIENT_ROLE" as const;

  constructor(message = "Rol insuficient pentru această acțiune") {
    super(message);
    this.name = "InsufficientRoleError";
  }
}

/** Higher number = more privileged. */
export const MEMBERSHIP_ROLE_RANK: Record<MembershipRole, number> = {
  viewer: 1,
  sales: 2,
  manager: 3,
  owner: 4,
};

export function hasMinimumRole(actual: MembershipRole, minimum: MembershipRole): boolean {
  const actualRank = MEMBERSHIP_ROLE_RANK[actual] ?? 0;
  const minimumRank = MEMBERSHIP_ROLE_RANK[minimum] ?? 0;
  return actualRank >= minimumRank;
}

export function hasAnyRole(actual: MembershipRole, allowed: readonly MembershipRole[]): boolean {
  return allowed.includes(actual);
}

/**
 * Assert entity.tenantId matches the verified active tenant.
 * Never pass a client-supplied tenant id as `expectedTenantId`.
 */
export function assertTenantAccess(expectedTenantId: string, actualTenantId: string): void {
  if (!expectedTenantId || !actualTenantId || expectedTenantId !== actualTenantId) {
    throw new TenantAccessError("Cross-tenant access denied");
  }
}
