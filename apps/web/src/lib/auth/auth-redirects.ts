/**
 * Pure helpers for tenant-aware Auth redirects.
 * Always use relative paths so the current Host (acme/beta) is preserved.
 */

export function dashboardPath(): string {
  return "/dashboard";
}

export function loginPath(searchParams?: Record<string, string | undefined>): string {
  const path = "/login";
  if (!searchParams) return path;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) qs.set(key, value);
  }
  const serialized = qs.toString();
  return serialized ? `${path}?${serialized}` : path;
}

/**
 * Post-login destination. Optional `next` must already be sanitized by the caller
 * (relative path only — never absolute / open redirect).
 */
export function resolvePostLoginPath(next?: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.includes("://")) {
    return next;
  }
  return dashboardPath();
}

export function resolveUnauthenticatedDashboardPath(): string {
  return loginPath({ auth: "required" });
}
