import { revalidatePath, unstable_cache, updateTag } from "next/cache";

/**
 * Short ISR / Data Cache window for public storefront (catalog / vehicle detail / CMS).
 *
 * Business SLA (Etapa 23A.2): public inventory may be at most this many seconds
 * stale if a mutation fails to call {@link revalidatePublicStorefrontPaths}.
 * Mutations (status, reservation, archive, publish, branding, CMS/SEO) must revalidate.
 *
 * Must stay a numeric literal export so `export const revalidate = …` is statically
 * analyzable by Next.js. Optional env override is intentionally not used here.
 */
export const PUBLIC_STOREFRONT_REVALIDATE_SECONDS = 30 as const;

/**
 * Paths that must stay `force-dynamic` (client lists / no shared HTML cache).
 * Documented for tests and agents — not enforced by Next automatically.
 */
export const PUBLIC_STOREFRONT_NO_HTML_CACHE_PATHS = [
  "/compara",
  "/salvate",
] as const;

/** Data-cache tag scoped to one tenant (never cross-tenant). */
export function publicStorefrontTenantTag(tenantId: string): string {
  return `public-sf:${tenantId}`;
}

/**
 * Short Data Cache wrapper for public storefront loaders.
 * Skips `unstable_cache` under Vitest (no Next incrementalCache).
 */
export async function runPublicStorefrontCached<T>(
  keyParts: string[],
  tenantId: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (process.env.VITEST) {
    return fn();
  }
  return unstable_cache(fn, keyParts, {
    revalidate: PUBLIC_STOREFRONT_REVALIDATE_SECONDS,
    tags: [publicStorefrontTenantTag(tenantId)],
  })();
}

/**
 * Revalidate public catalog + vehicle segment after inventory / branding changes.
 * Host-keyed CDN entries still vary by Host on Vercel; path revalidation clears
 * the Next Full Route / Data Cache for these routes. `updateTag` is for Server Actions
 * (read-your-writes) when a tenant-scoped Data Cache tag was used.
 */
export function revalidatePublicStorefrontPaths(input?: {
  vehicleSlug?: string | null;
  tenantId?: string | null;
}): void {
  revalidatePath("/", "layout");
  revalidatePath("/vehicles", "layout");
  revalidatePath("/p", "layout");
  if (input?.vehicleSlug) {
    revalidatePath(`/vehicles/${input.vehicleSlug}`);
  }
  if (input?.tenantId) {
    updateTag(publicStorefrontTenantTag(input.tenantId));
  }
}

/** Whether middleware must call Supabase `getUser()` for this path. */
export function middlewarePathRequiresAuthSession(pathname: string): boolean {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return true;
  if (pathname === "/storefront-template-preview") return true;
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  if (pathname === "/invite" || pathname.startsWith("/invite/")) return true;
  return false;
}

/**
 * Public paths eligible for short route `revalidate` (not Compară / Salvate / private).
 * Documented for tests — CDN Cache-Control is intentionally not the primary mechanism.
 */
export function isPublicStorefrontRevalidatePath(pathname: string): boolean {
  if (middlewarePathRequiresAuthSession(pathname)) return false;
  if (pathname === "/compara" || pathname.startsWith("/compara/")) return false;
  if (pathname === "/salvate" || pathname.startsWith("/salvate/")) return false;
  if (pathname === "/" || pathname.startsWith("/vehicles/") || pathname.startsWith("/p/")) {
    return true;
  }
  return false;
}
