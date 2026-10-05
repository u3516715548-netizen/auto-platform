import { assertTenantAccess as assertTenantAccessCore } from "@auto-platform/core";

/**
 * App-layer re-export: entity.tenantId must equal the verified tenant.
 * Call only with server-verified expectedTenantId (from requireMembership / host).
 */
export function assertTenantAccess(expectedTenantId: string, actualTenantId: string): void {
  assertTenantAccessCore(expectedTenantId, actualTenantId);
}
