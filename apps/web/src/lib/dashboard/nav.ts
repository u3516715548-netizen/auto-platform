/**
 * Dashboard navigation — relative paths only (preserve dealer Host).
 */

export type DashboardNavItem = {
  href: string;
  label: string;
  /** exact = only `/dashboard`; prefix = `/dashboard/vehicles…` */
  match: "exact" | "prefix";
};

export const DASHBOARD_NAV: readonly DashboardNavItem[] = [
  { href: "/dashboard", label: "Prezentare", match: "exact" },
  { href: "/dashboard/vehicles", label: "Vehicule", match: "prefix" },
] as const;

export function isDashboardNavActive(pathname: string, item: DashboardNavItem): boolean {
  if (item.match === "exact") {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function vehiclesPath(searchParams?: Record<string, string | undefined>): string {
  const path = "/dashboard/vehicles";
  if (!searchParams) return path;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) qs.set(key, value);
  }
  const serialized = qs.toString();
  return serialized ? `${path}?${serialized}` : path;
}

export function vehicleCreatePath(): string {
  return "/dashboard/vehicles/new";
}

export function vehicleEditPath(
  id: string,
  searchParams?: Record<string, string | undefined>,
): string {
  const path = `/dashboard/vehicles/${id}`;
  if (!searchParams) return path;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) qs.set(key, value);
  }
  const serialized = qs.toString();
  return serialized ? `${path}?${serialized}` : path;
}
