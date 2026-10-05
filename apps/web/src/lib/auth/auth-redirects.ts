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

export function resolvePostLoginPath(): string {
  return dashboardPath();
}

export function resolveUnauthenticatedDashboardPath(): string {
  return loginPath({ auth: "required" });
}
