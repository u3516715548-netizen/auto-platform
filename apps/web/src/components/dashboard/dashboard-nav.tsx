"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DASHBOARD_NAV, isDashboardNavActive } from "@/lib/dashboard/nav";
import { formatNewLeadsBadge } from "@/lib/leads/new-leads-badge";

type DashboardNavProps = {
  orientation?: "horizontal" | "vertical";
  newLeadsCount?: number;
};

export function DashboardNav({
  orientation = "horizontal",
  newLeadsCount = 0,
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
          : "flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      }
    >
      {DASHBOARD_NAV.map((item) => {
        const active = isDashboardNavActive(pathname, item);
        const showBadge = item.href === "/dashboard/leads" && badge.visible;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700",
              isVertical ? "w-full justify-start" : "justify-center",
              active
                ? "bg-teal-800 text-white"
                : "text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900",
            ].join(" ")}
            aria-current={active ? "page" : undefined}
          >
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
