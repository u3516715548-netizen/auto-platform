"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DASHBOARD_NAV, isDashboardNavActive } from "@/lib/dashboard/nav";

type DashboardNavProps = {
  orientation?: "horizontal" | "vertical";
};

export function DashboardNav({ orientation = "horizontal" }: DashboardNavProps) {
  const pathname = usePathname() || "/dashboard";
  const isVertical = orientation === "vertical";

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
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "inline-flex min-h-11 shrink-0 items-center rounded-md px-3.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700",
              isVertical ? "w-full justify-start" : "justify-center",
              active
                ? "bg-teal-800 text-white"
                : "text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900",
            ].join(" ")}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
