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
  | "preferences";

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
  /** Expandable group children (e.g. Personalizare). */
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

export function isSettingsChildActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
