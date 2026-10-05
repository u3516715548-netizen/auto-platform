import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { TenantResolutionError, type TenantContext } from "@auto-platform/core";
import { getDb, tenants } from "@auto-platform/db";
import { getRootDomain } from "@/lib/supabase/env";
import { requireTenantSlugFromHost, resolveTenantSlugFromHost } from "./resolve-tenant-from-host";
import { resolveVercelDemoTenantSlugFromRequest } from "./vercel-demo-only";

export type CurrentTenant = TenantContext & {
  name: string;
  status: "active" | "suspended" | "trial";
  plan: "starter" | "premium";
};

function requestHost(headerStore: Awaited<ReturnType<typeof headers>>): string {
  return headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
}

/**
 * Resolve tenant from the request Host header (server-side).
 * Does not trust client-supplied tenant_id.
 *
 * VERCEL_DEMO_ONLY: on Hobby apex Host only, may load a single server-env slug.
 * Local / production Host-based tenancy is unchanged.
 */
export async function getCurrentTenant(): Promise<CurrentTenant | null> {
  const headerStore = await headers();
  const host = requestHost(headerStore);
  const rootDomain = getRootDomain();
  const resolved = resolveTenantSlugFromHost(host, rootDomain);

  if (resolved.kind === "tenant") {
    return loadTenantBySlug(resolved.slug);
  }
  if (resolved.kind === "invalid") {
    throw new TenantResolutionError(`Invalid host for tenant resolution (${resolved.reason})`);
  }

  // apex — optional Vercel Hobby demo fallback (fail-closed if slug missing / invalid)
  const demoSlug = resolveVercelDemoTenantSlugFromRequest(host, rootDomain);
  if (demoSlug) {
    return loadTenantBySlug(demoSlug);
  }

  return null;
}

/** For protected tenant routes (e.g. dashboard): tenant must exist and not be suspended. */
export async function requireCurrentTenant(): Promise<CurrentTenant> {
  const headerStore = await headers();
  const host = requestHost(headerStore);
  const rootDomain = getRootDomain();
  const resolved = resolveTenantSlugFromHost(host, rootDomain);

  let slug: string;
  if (resolved.kind === "tenant") {
    slug = resolved.slug;
  } else if (resolved.kind === "apex") {
    const demoSlug = resolveVercelDemoTenantSlugFromRequest(host, rootDomain);
    if (!demoSlug) {
      throw new TenantResolutionError("Tenant slug required; apex host has no tenant");
    }
    slug = demoSlug;
  } else {
    // Keep Host-based error semantics for invalid hosts.
    slug = requireTenantSlugFromHost(host, rootDomain);
  }

  const tenant = await loadTenantBySlug(slug);

  if (tenant.status === "suspended") {
    throw new TenantResolutionError("Tenant is suspended");
  }

  return tenant;
}

export async function loadTenantBySlug(slug: string): Promise<CurrentTenant> {
  const db = getDb();
  const [row] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);

  if (!row) {
    throw new TenantResolutionError("Tenant not found for host slug");
  }

  return {
    tenantId: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    plan: row.plan,
  };
}
