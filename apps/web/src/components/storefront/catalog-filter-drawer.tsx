"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CatalogQuery } from "@/lib/storefront/catalog-query";
import {
  catalogQueryHasFilterChips,
  countActiveCatalogFilters,
} from "@/lib/storefront/catalog-chips";
import {
  CATALOG_DRAWER_FOCUSABLE_SELECTOR,
  catalogDrawerBodyOverflow,
  resolveFocusTrapIndex,
} from "@/lib/storefront/catalog-drawer-a11y";
import { CatalogFilters } from "@/components/storefront/catalog-filters";

type CatalogFilterDrawerProps = {
  query: CatalogQuery;
};

function listFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(CATALOG_DRAWER_FOCUSABLE_SELECTOR),
  ).filter((el) => {
    if (el.hasAttribute("disabled")) return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    return el.getClientRects().length > 0;
  });
}

function FilterIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-4 shrink-0"
      fill="currentColor"
    >
      <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h11a1.5 1.5 0 0 1 1.06 2.56L12 11.12V15a1 1 0 0 1-1.45.89l-2-1A1 1 0 0 1 8 14v-2.88L3.44 6.56A1.5 1.5 0 0 1 3 5.5Z" />
    </svg>
  );
}

export function CatalogFilterDrawer({ query }: CatalogFilterDrawerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const panelId = `catalog-filter-drawer-${reactId.replace(/:/g, "")}`;
  const titleId = `${panelId}-title`;
  const activeCount = countActiveCatalogFilters(query);
  const hasFilters = catalogQueryHasFilterChips(query);

  function close() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = catalogDrawerBodyOverflow(true);
    const trigger = triggerRef.current;

    const panel = panelRef.current;
    const focusables = panel ? listFocusable(panel) : [];
    const initial = focusables[0] ?? panel;
    initial?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const items = listFocusable(panelRef.current);
      if (items.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const active = document.activeElement;
      const focusedIndex = items.findIndex((el) => el === active);
      const nextIndex = resolveFocusTrapIndex(
        focusedIndex < 0 ? 0 : focusedIndex,
        items.length,
        event.shiftKey,
      );
      if (nextIndex === null) return;
      event.preventDefault();
      items[nextIndex]?.focus();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow || catalogDrawerBodyOverflow(false);
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [open]);

  const triggerLabel =
    activeCount > 0 ? `Filtre (${activeCount})` : "Filtre";

  return (
    <div className="md:hidden">
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <FilterIcon />
        {triggerLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-900/45 motion-safe:transition-opacity motion-safe:duration-200 motion-reduce:transition-none"
            aria-label="Închide filtrele"
            onClick={close}
          />
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="catalog-filter-drawer-panel relative z-10 flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-zinc-200 bg-white shadow-xl outline-none"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
              <h2 id={titleId} className="text-base font-semibold text-zinc-900">
                Filtre
              </h2>
              <button
                type="button"
                onClick={close}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                aria-label="Închide filtrele"
              >
                Închide
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <CatalogFilters
                query={query}
                idPrefix="catalog-mobile"
                submitLabel="Aplică filtrele"
                showReset={hasFilters}
                className="flex flex-col gap-4 border-0 bg-transparent p-0"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
