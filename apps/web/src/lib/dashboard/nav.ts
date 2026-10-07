/**
 * Dashboard navigation — relative paths only (preserve dealer Host).
 */

export type DashboardPrimaryIconName =
  | "overview"
  | "vehicles"
  | "reservations"
  | "leads"
  | "settings";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: DashboardPrimaryIconName;
  /** exact = only `/dashboard`; prefix = `/dashboard/vehicles…` */
  match: "exact" | "prefix";
  /** Expandable settings tree under this item. */
  settingsGroup?: boolean;
};

export const DASHBOARD_NAV: readonly DashboardNavItem[] = [
  { href: "/dashboard", label: "Prezentare", icon: "overview", match: "exact" },
  { href: "/dashboard/vehicles", label: "Vehicule", icon: "vehicles", match: "prefix" },
  {
    href: "/dashboard/reservations",
    label: "Rezervări",
    icon: "reservations",
    match: "prefix",
  },
  { href: "/dashboard/leads", label: "Lead-uri", icon: "leads", match: "prefix" },
  {
    href: "/dashboard/settings",
    label: "Setări",
    icon: "settings",
    match: "prefix",
    settingsGroup: true,
  },
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

export function leadsPath(searchParams?: Record<string, string | undefined>): string {
  const path = "/dashboard/leads";
  if (!searchParams) return path;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) qs.set(key, value);
  }
  const serialized = qs.toString();
  return serialized ? `${path}?${serialized}` : path;
}

export function leadDetailPath(
  id: string,
  searchParams?: Record<string, string | undefined>,
): string {
  const path = `/dashboard/leads/${id}`;
  if (!searchParams) return path;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) qs.set(key, value);
  }
  const serialized = qs.toString();
  return serialized ? `${path}?${serialized}` : path;
}

export function reservationsPath(searchParams?: Record<string, string | undefined>): string {
  const path = "/dashboard/reservations";
  if (!searchParams) return path;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) qs.set(key, value);
  }
  const serialized = qs.toString();
  return serialized ? `${path}?${serialized}` : path;
}

export function reservationDetailPath(
  id: string,
  searchParams?: Record<string, string | undefined>,
): string {
  const path = `/dashboard/reservations/${id}`;
  if (!searchParams) return path;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) qs.set(key, value);
  }
  const serialized = qs.toString();
  return serialized ? `${path}?${serialized}` : path;
}
