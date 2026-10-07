"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import type { MembershipRole } from "@auto-platform/types";
import { DASHBOARD_NAV, isDashboardNavActive } from "@/lib/dashboard/nav";
import {
  isCustomizationSectionActive,
  isSettingsChildActive,
  isSettingsNavActive,
  settingsNavForRole,
  type SettingsNavItem,
} from "@/lib/dashboard/settings-nav";
import { formatNewLeadsBadge } from "@/lib/leads/new-leads-badge";
import {
  DashboardNavIcon,
  IconChevronDown,
} from "@/components/dashboard/dashboard-nav-icons";

type DashboardNavProps = {
  orientation?: "horizontal" | "vertical";
  newLeadsCount?: number;
  role: MembershipRole;
};

function topLinkClass(active: boolean, vertical: boolean) {
  return [
    "inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700",
    vertical ? "w-full justify-start py-2" : "justify-center px-3",
    active ? "bg-teal-800 text-white" : "text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900",
  ].join(" ");
}

function settingsLeafClass(active: boolean, compact?: boolean) {
  if (compact) {
    return `inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
      active
        ? "bg-teal-800 text-white"
        : "bg-white text-zinc-800 ring-1 ring-zinc-300 hover:bg-zinc-50"
    }`;
  }
  return `flex min-h-11 items-start gap-2.5 rounded-md px-2.5 py-2 transition-colors ${
    active ? "bg-teal-800 text-white" : "text-zinc-800 hover:bg-zinc-50"
  }`;
}

function CustomizationGroup({
  item,
  pathname,
  compact,
}: {
  item: SettingsNavItem;
  pathname: string;
  compact?: boolean;
}) {
  const children = item.children ?? [];
  const sectionActive = isCustomizationSectionActive(pathname);
  const [expanded, setExpanded] = useState(sectionActive);
  const panelId = useId();

  useEffect(() => {
    if (sectionActive) setExpanded(true);
  }, [sectionActive]);

  const parentHighlighted =
    sectionActive && !children.some((c) => isSettingsChildActive(pathname, c.href));

  if (compact) {
    return (
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          className={settingsLeafClass(parentHighlighted, true)}
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((v) => !v)}
        >
          <DashboardNavIcon name={item.icon} size={16} />
          {item.label}
          <IconChevronDown
            size={14}
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
        {expanded
          ? children.map((child) => {
              const active = isSettingsChildActive(pathname, child.href);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  aria-current={active ? "page" : undefined}
                  className={settingsLeafClass(active, true)}
                >
                  <DashboardNavIcon name={child.icon} size={14} />
                  {child.label}
                </Link>
              );
            })
          : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        className={`${settingsLeafClass(parentHighlighted)} w-full text-left`}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className={`mt-0.5 ${parentHighlighted ? "text-current" : "text-zinc-500"}`}>
          <DashboardNavIcon name={item.icon} size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{item.label}</span>
          <span
            className={`mt-0.5 block text-xs ${parentHighlighted ? "text-teal-100" : "text-zinc-500"}`}
          >
            {item.description}
          </span>
        </span>
        <IconChevronDown
          size={16}
          className={`mt-1 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded ? (
        <ul id={panelId} className="ml-3 flex flex-col gap-0.5 border-l border-zinc-200 pl-2">
          {children.map((child) => {
            const active = isSettingsChildActive(pathname, child.href);
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-10 items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-teal-800 text-white"
                      : "text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  <DashboardNavIcon name={child.icon} size={16} />
                  {child.label}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function SettingsTree({
  role,
  pathname,
  compact,
}: {
  role: MembershipRole;
  pathname: string;
  compact?: boolean;
}) {
  const items = settingsNavForRole(role);

  if (compact) {
    return (
      <>
        {items.map((item) => {
          if (item.children?.length) {
            return (
              <CustomizationGroup
                key={item.href}
                item={item}
                pathname={pathname}
                compact
              />
            );
          }
          const active = isSettingsNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={settingsLeafClass(active, true)}
            >
              <DashboardNavIcon name={item.icon} size={16} />
              {item.label}
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <ul className="ml-2 flex flex-col gap-0.5 border-l border-zinc-200 pl-2">
      {items.map((item) => {
        if (item.children?.length) {
          return (
            <li key={item.href}>
              <CustomizationGroup item={item} pathname={pathname} />
            </li>
          );
        }
        const active = isSettingsNavActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={settingsLeafClass(active)}
            >
              <span className={`mt-0.5 ${active ? "text-white" : "text-zinc-500"}`}>
                <DashboardNavIcon name={item.icon} size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{item.label}</span>
                <span
                  className={`mt-0.5 block text-xs ${active ? "text-teal-100" : "text-zinc-500"}`}
                >
                  {item.description}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SettingsGroup({
  role,
  pathname,
  vertical,
  active,
}: {
  role: MembershipRole;
  pathname: string;
  vertical: boolean;
  active: boolean;
}) {
  const [expanded, setExpanded] = useState(active);
  const panelId = useId();

  useEffect(() => {
    if (active) setExpanded(true);
  }, [active]);

  if (!vertical) {
    return (
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          className={topLinkClass(active && !expanded, false)}
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((v) => !v)}
        >
          <DashboardNavIcon name="settings" size={16} />
          <span>Setări</span>
          <IconChevronDown
            size={14}
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
        {expanded ? (
          <div id={panelId} className="flex shrink-0 items-center gap-1.5">
            <SettingsTree role={role} pathname={pathname} compact />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        className={`${topLinkClass(active && !expanded, true)} text-left`}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className={active || expanded ? "text-current" : "text-zinc-500"}>
          <DashboardNavIcon name="settings" size={18} />
        </span>
        <span className="min-w-0 flex-1">Setări</span>
        <IconChevronDown
          size={16}
          className={`shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded ? (
        <div id={panelId}>
          <SettingsTree role={role} pathname={pathname} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Single dashboard sidebar / mobile strip: primary links with icons,
 * Setări expandable (General / Echipă / Detalii firmă / Personalizare…).
 */
export function DashboardNav({
  orientation = "horizontal",
  newLeadsCount = 0,
  role,
}: DashboardNavProps) {
  const pathname = usePathname() || "/dashboard";
  const isVertical = orientation === "vertical";
  const badge = formatNewLeadsBadge(newLeadsCount);

  return (
    <nav
      aria-label="Navigare dashboard"
      className={
        isVertical
          ? "flex flex-col gap-1"
          : "flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      }
    >
      {DASHBOARD_NAV.map((item) => {
        const active = isDashboardNavActive(pathname, item);

        if (item.settingsGroup) {
          return (
            <SettingsGroup
              key={item.href}
              role={role}
              pathname={pathname}
              vertical={isVertical}
              active={active}
            />
          );
        }

        const showBadge = item.href === "/dashboard/leads" && badge.visible;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={topLinkClass(active, isVertical)}
            aria-current={active ? "page" : undefined}
          >
            <span className={active ? "text-current" : "text-zinc-500"}>
              <DashboardNavIcon name={item.icon} size={isVertical ? 18 : 16} />
            </span>
            <span>{item.label}</span>
            {showBadge ? (
              <span
                className={[
                  "inline-flex min-w-5 items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                  active ? "bg-white/20 text-white" : "bg-teal-100 text-teal-950",
                ].join(" ")}
                aria-label={badge.ariaLabel}
              >
                <span aria-hidden="true">{badge.display}</span>
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
