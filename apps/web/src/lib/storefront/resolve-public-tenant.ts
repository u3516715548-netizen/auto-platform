import { eq } from "drizzle-orm";
import { cache } from "react";
import { headers } from "next/headers";
import { getDb, tenants } from "@auto-platform/db";
import type { StorefrontTemplateId } from "@auto-platform/types";
import { getRootDomain } from "@/lib/supabase/env";
import { resolveTenantSlugFromHost } from "@/lib/tenant/resolve-tenant-from-host";
import {
  isHobbyDemoPublicLeadsDisabledFromRequest,
  resolveHobbyDemoTenantSlugFromRequest,
} from "@/lib/tenant/vercel-demo-only";
import { clearPublicSessionGucs } from "./clear-public-session";
import { parsePublicBranding } from "./public-dto";

/** Server-only public tenant (includes id/status for server logic). */
export type PublicTenantRecord = {
  tenantId: string;
  slug: string;
  name: string;
  status: "active" | "trial";
  primaryColor: string;
  templateId: StorefrontTemplateId;
  phone?: string;
  whatsapp?: string;
};

/**
 * Safe client-facing tenant view — no id, no raw branding, no status.
 * primaryColor / templateId always resolved with Template 1 fallbacks.
 */
export type PublicTenantView = {
  slug: string;
  name: string;
  primaryColor: string;
  templateId: StorefrontTemplateId;
  phone?: string;
  whatsapp?: string;
  /** Whether public lead form is allowed (active only). */
  leadsEnabled: boolean;
};

export type ResolvePublicTenantResult =
  | { kind: "apex" }
  | { kind: "not_found" }
  | { kind: "ok"; tenant: PublicTenantRecord };

/**
 * Resolves a public storefront tenant from Host.
 * Does not set staff session GUCs (keeps app.current_profile_id NULL for RLS).
 * Never trusts client tenant_id.
 *
 * HOBBY_DEMO_ONLY: on Hobby apex Host only, may load a single server-env slug.
 * Missing/inactive demo slug → not_found (fail-closed), never another tenant.
 *
 * Wrapped in React `cache()` so `generateMetadata` + page share one resolve per request.
 */
export const resolvePublicTenantFromHost = cache(
  async (): Promise<ResolvePublicTenantResult> => {
    const headerStore = await headers();
    const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
    const rootDomain = getRootDomain();
    const resolved = resolveTenantSlugFromHost(host, rootDomain);

    if (resolved.kind === "apex") {
      const demoSlug = resolveHobbyDemoTenantSlugFromRequest(host, rootDomain);
      if (demoSlug) {
        return loadPublicTenantBySlug(demoSlug);
      }
      return { kind: "apex" };
    }
    if (resolved.kind === "invalid") {
      return { kind: "not_found" };
    }

    return loadPublicTenantBySlug(resolved.slug);
  },
);

/**
 * Loads public tenant by slug under anon RLS context (no profile GUC).
 * Suspended / missing → not_found.
 */
export async function loadPublicTenantBySlug(
  slug: string,
): Promise<Extract<ResolvePublicTenantResult, { kind: "ok" | "not_found" }>> {
  const db = getDb();
  // Clear any leftover session GUCs from pooled connections so public RLS applies.
  await clearPublicSessionGucs(db);

  const [row] = await db
    .select({
      id: tenants.id,
      slug: tenants.slug,
      name: tenants.name,
      status: tenants.status,
      branding: tenants.branding,
    })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  if (!row) {
    return { kind: "not_found" };
  }

  if (row.status === "suspended") {
    return { kind: "not_found" };
  }

  if (row.status !== "active" && row.status !== "trial") {
    return { kind: "not_found" };
  }

  const branding = parsePublicBranding(row.branding);

  return {
    kind: "ok",
    tenant: {
      tenantId: row.id,
      slug: row.slug,
      name: row.name,
      status: row.status,
      primaryColor: branding.primaryColor,
      templateId: branding.templateId,
      ...(branding.phone ? { phone: branding.phone } : {}),
      ...(branding.whatsapp ? { whatsapp: branding.whatsapp } : {}),
    },
  };
}

export function toPublicTenantView(
  tenant: PublicTenantRecord,
  options?: { publicLeadsDisabled?: boolean },
): PublicTenantView {
  const publicLeadsDisabled = options?.publicLeadsDisabled === true;
  return {
    slug: tenant.slug,
    name: tenant.name,
    primaryColor: tenant.primaryColor,
    templateId: tenant.templateId,
    ...(tenant.phone ? { phone: tenant.phone } : {}),
    ...(tenant.whatsapp ? { whatsapp: tenant.whatsapp } : {}),
    leadsEnabled: tenant.status === "active" && !publicLeadsDisabled,
  };
}

/**
 * Builds the public tenant view including HOBBY_DEMO lead disable (server Host/env).
 * Call from Server Components / actions only.
 */
export async function toPublicTenantViewForRequest(
  tenant: PublicTenantRecord,
): Promise<PublicTenantView> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
  const rootDomain = getRootDomain();
  return toPublicTenantView(tenant, {
    publicLeadsDisabled: isHobbyDemoPublicLeadsDisabledFromRequest(host, rootDomain),
  });
}

/** True when public catalog/detail must 404/deny (invalid or suspended host). */
export function shouldDenyPublicStorefront(
  result: ResolvePublicTenantResult,
): boolean {
  return result.kind === "not_found";
}
