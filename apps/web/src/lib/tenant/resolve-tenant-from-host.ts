import { tenantSlugSchema } from "@auto-platform/types";
import { TenantResolutionError } from "@auto-platform/core";

export type HostTenantResolution =
  | { kind: "apex" }
  | { kind: "tenant"; slug: string }
  | { kind: "invalid"; reason: string };

/**
 * Pure host → tenant slug resolution.
 * Never accepts client body/query tenant_id.
 *
 * Examples (rootDomain = localhost:3000):
 * - acme.localhost:3000 → acme
 * - beta.localhost:3000 → beta
 * - localhost:3000 → apex
 */
export function resolveTenantSlugFromHost(
  hostHeader: string,
  rootDomain: string,
): HostTenantResolution {
  const host = normalizeHost(hostHeader);
  const root = normalizeHost(rootDomain);

  if (!host || !root) {
    return { kind: "invalid", reason: "missing_host_or_root_domain" };
  }

  if (host === root) {
    return { kind: "apex" };
  }

  const suffix = `.${root}`;
  if (!host.endsWith(suffix)) {
    return { kind: "invalid", reason: "host_outside_root_domain" };
  }

  const subdomain = host.slice(0, -suffix.length);
  if (!subdomain || subdomain.includes(".")) {
    // Multi-level subdomains not supported in Etapa 3.
    return { kind: "invalid", reason: "invalid_subdomain" };
  }

  const parsed = tenantSlugSchema.safeParse(subdomain);
  if (!parsed.success) {
    return { kind: "invalid", reason: "invalid_tenant_slug" };
  }

  return { kind: "tenant", slug: parsed.data };
}

export function requireTenantSlugFromHost(hostHeader: string, rootDomain: string): string {
  const resolved = resolveTenantSlugFromHost(hostHeader, rootDomain);
  if (resolved.kind === "tenant") {
    return resolved.slug;
  }
  if (resolved.kind === "apex") {
    throw new TenantResolutionError("Tenant slug required; apex host has no tenant");
  }
  throw new TenantResolutionError(`Invalid host for tenant resolution (${resolved.reason})`);
}

function normalizeHost(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, "");
}
