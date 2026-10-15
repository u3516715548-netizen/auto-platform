import type { MembershipRole } from "@auto-platform/types";
import { hasAnyRole } from "@auto-platform/core";

/**
 * Owner-only settings sections. Project has no separate „admin” role —
 * `owner` is the administrator convention (matches branding updates).
 */
export const SETTINGS_OWNER_ROLES = ["owner"] as const satisfies readonly MembershipRole[];

export type SettingsNavIconName =
  | "general"
  | "team"
  | "company"
  | "customization"
  | "themes"
  | "pages"
  | "preferences"
  | "marketing"
  | "marketing-overview"
  | "marketing-seo"
  | "marketing-health"
  | "marketing-analytics"
  | "marketing-verification";

export type SettingsNavChild = {
  href: string;
  label: string;
  icon: SettingsNavIconName;
};

export type SettingsNavItem = {
  href: string;
  label: string;
  description: string;
  /** When true, only SETTINGS_OWNER_ROLES may open the page (and see the link). */
  ownerOnly: boolean;
  icon: SettingsNavIconName;
  /** Expandable group children (e.g. Personalizare / Marketing). */
  children?: readonly SettingsNavChild[];
};

export const SETTINGS_NAV: readonly SettingsNavItem[] = [
  {
    href: "/dashboard/settings/general",
    label: "General",
    description: "Profilul tău",
    ownerOnly: false,
    icon: "general",
  },
  {
    href: "/dashboard/settings/team",
    label: "Echipa",
    description: "Membri și roluri",
    ownerOnly: true,
    icon: "team",
  },
  {
    href: "/dashboard/settings/company",
    label: "Detalii firmă",
    description: "Identitate și contact",
    ownerOnly: true,
    icon: "company",
  },
  {
    href: "/dashboard/settings/customization",
    label: "Personalizare",
    description: "Storefront",
    ownerOnly: true,
    icon: "customization",
    children: [
      {
        href: "/dashboard/settings/customization/themes",
        label: "Teme",
        icon: "themes",
      },
      {
        href: "/dashboard/settings/customization/pages",
        label: "Pagini",
        icon: "pages",
      },
      {
        href: "/dashboard/settings/customization/preferences",
        label: "Preferințe",
        icon: "preferences",
      },
    ],
  },
  {
    href: "/dashboard/settings/marketing",
    label: "Marketing",
    description: "SEO, Analytics, Ads",
    ownerOnly: true,
    icon: "marketing",
    children: [
      {
        href: "/dashboard/settings/marketing",
        label: "Overview",
        icon: "marketing-overview",
      },
      {
        href: "/dashboard/settings/marketing/seo",
        label: "SEO",
        icon: "marketing-seo",
      },
      {
        href: "/dashboard/settings/marketing/health",
        label: "SEO Health",
        icon: "marketing-health",
      },
      {
        href: "/dashboard/settings/marketing/analytics",
        label: "Analytics & Ads",
        icon: "marketing-analytics",
      },
      {
        href: "/dashboard/settings/marketing/verification",
        label: "Verification",
        icon: "marketing-verification",
      },
    ],
  },
] as const;

export function canAccessSettingsOwnerSection(role: MembershipRole): boolean {
  return hasAnyRole(role, SETTINGS_OWNER_ROLES);
}

export function settingsNavForRole(role: MembershipRole): SettingsNavItem[] {
  const isOwner = canAccessSettingsOwnerSection(role);
  return SETTINGS_NAV.filter((item) => !item.ownerOnly || isOwner);
}

export function isSettingsNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** True when any Personalizare child (or preview under themes) is active. */
export function isCustomizationSectionActive(pathname: string): boolean {
  return (
    pathname === "/dashboard/settings/customization" ||
    pathname.startsWith("/dashboard/settings/customization/")
  );
}

/** True when Marketing overview or any Marketing child is active. */
export function isMarketingSectionActive(pathname: string): boolean {
  return (
    pathname === "/dashboard/settings/marketing" ||
    pathname.startsWith("/dashboard/settings/marketing/")
  );
}

/**
 * Section active for expandable settings groups.
 * Prefer exact child match over parent-only when children exist.
 */
export function isSettingsGroupSectionActive(pathname: string, item: SettingsNavItem): boolean {
  if (item.href === "/dashboard/settings/customization") {
    return isCustomizationSectionActive(pathname);
  }
  if (item.href === "/dashboard/settings/marketing") {
    return isMarketingSectionActive(pathname);
  }
  return isSettingsNavActive(pathname, item.href);
}

export function isSettingsChildActive(pathname: string, href: string): boolean {
  // Overview lives at the group root — only exact match so children don't highlight it.
  if (href === "/dashboard/settings/marketing") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
