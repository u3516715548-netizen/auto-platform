/**
 * Pure post-filter for alternatives (tenant isolation + available + exclude current).
 * Safe for unit tests — no DB / Supabase imports.
 */
export function filterPublicAlternativeRows<
  T extends { tenantId: string; status: string; slug: string },
>(rows: T[], tenantId: string, excludeSlug: string): T[] {
  return rows.filter(
    (row) =>
      row.tenantId === tenantId &&
      row.status === "available" &&
      row.slug !== excludeSlug,
  );
}
