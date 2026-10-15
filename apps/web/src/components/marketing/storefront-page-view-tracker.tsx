"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { emitMarketingEvent } from "@/lib/marketing/emit-marketing-event";

function resolvePageType(pathname: string): string {
  if (pathname === "/" || pathname === "") return "catalog";
  if (pathname.startsWith("/vehicles/")) return "vehicle_detail";
  if (pathname.startsWith("/compara")) return "compare";
  if (pathname.startsWith("/salvate")) return "saved";
  if (pathname.startsWith("/p/")) return "cms_page";
  return "other";
}

/**
 * Once-per-route page_view for tenant storefront (App Router).
 * Dedupe key includes pathname + search so filter navigations count as new views.
 */
export function StorefrontPageViewTracker() {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    const key = `page_view:${pathname}?${search}`;
    if (lastKey.current === key) return;
    lastKey.current = key;

    emitMarketingEvent(
      "page_view",
      {
        page_type: resolvePageType(pathname),
        page_path: search ? `${pathname}?${search}` : pathname,
      },
      { dedupeKey: key },
    );
  }, [pathname, search]);

  return null;
}
