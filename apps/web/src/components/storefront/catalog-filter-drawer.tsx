"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { CatalogQuery } from "@/lib/storefront/catalog-query";
import {
  catalogQueryHasFilterChips,
  countActiveCatalogFilters,
  resetCatalogHref,
} from "@/lib/storefront/catalog-chips";
import {
  CATALOG_DRAWER_FOCUSABLE_SELECTOR,
  catalogDrawerBodyOverflow,
  resolveFocusTrapIndex,
} from "@/lib/storefront/catalog-drawer-a11y";
import { CatalogFilters } from "@/components/storefront/catalog-filters";
import {
  CatalogQuickSheet,
  type QuickSheetKind,
} from "@/components/storefront/catalog-quick-sheets";
import {
  IconBody,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconFuel,
  IconGrid,
  IconSearch,
  IconSliders,
  IconTag,
} from "@/components/storefront/icons";

type CatalogFilterDrawerProps = {
  query: CatalogQuery;
  brands?: string[];
  priceCeiling?: number;
  yearFloor?: number;
  yearCeiling?: number;
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

const pillClass =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--sf-border)] bg-white px-3 text-sm font-semibold text-[var(--sf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]";

const DEFAULT_BRANDS = [
  "Alfa Romeo",
  "Audi",
  "BMW",
  "Citroën",
  "Dacia",
  "Fiat",
  "Ford",
  "Hyundai",
  "Kia",
  "Mercedes-Benz",
  "Opel",
  "Peugeot",
  "Renault",
  "Skoda",
  "Toyota",
  "Volkswagen",
  "Volvo",
];

/**
 * Catalog filter chrome (all breakpoints) — tabs, search, quick pills;
 * „Toate filtrele” opens the advanced drawer (mobile sheet / desktop panel).
 */
export function CatalogFilterDrawer({
  query,
  brands = DEFAULT_BRANDS,
  priceCeiling = 114_000,
  yearFloor = 2001,
  yearCeiling = new Date().getFullYear(),
}: CatalogFilterDrawerProps) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState<QuickSheetKind | null>(null);
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

  function openDrawer() {
    setSheet(null);
    setOpen(true);
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

  useEffect(() => {
    if (!sheet) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = catalogDrawerBodyOverflow(true);
    return () => {
      document.body.style.overflow = previousOverflow || catalogDrawerBodyOverflow(false);
    };
  }, [sheet]);

  const triggerHint =
    activeCount > 0
      ? `${activeCount} ${activeCount === 1 ? "filtru activ" : "filtre active"}`
      : "Cutie · km · TVA · scaune · dotări";

  return (
    <div>
      <div className="sf-solid-card flex flex-col gap-3 rounded-2xl border border-[var(--sf-border)] p-3 md:gap-4 md:p-5">
        <div
          className="flex rounded-full bg-[var(--sf-surface-muted)] p-1 md:max-w-md"
          role="presentation"
        >
          <span className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full bg-white px-3 text-sm font-semibold text-[var(--sf-text)] shadow-sm">
            În stoc
          </span>
          <span
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full px-3 text-sm font-medium text-[var(--sf-text-muted)]"
            title="Disponibil ulterior"
          >
            Urmează în stoc
          </span>
        </div>

        <form method="GET" action="/" className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--sf-text-muted)]">
            <IconSearch size={18} />
          </span>
          <label htmlFor={`${panelId}-quick-q`} className="sr-only">
            Caută marca sau modelul
          </label>
          <input
            id={`${panelId}-quick-q`}
            name="q"
            type="search"
            defaultValue={query.q ?? ""}
            maxLength={80}
            placeholder="Caută marca sau modelul..."
            className="min-h-12 w-full rounded-2xl border border-[var(--sf-border)] bg-[var(--sf-surface-muted)] py-2.5 pr-3 pl-11 text-sm text-[var(--sf-text)] placeholder:text-[var(--sf-text-muted)] focus:border-[var(--sf-accent)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--sf-accent)_25%,transparent)]"
          />
          {query.make.map((m) => (
            <input key={`make-${m}`} type="hidden" name="make" value={m} />
          ))}
          {query.priceMin != null ? (
            <input type="hidden" name="priceMin" value={query.priceMin} />
          ) : null}
          {query.priceMax != null ? (
            <input type="hidden" name="priceMax" value={query.priceMax} />
          ) : null}
          {query.yearMin != null ? (
            <input type="hidden" name="yearMin" value={query.yearMin} />
          ) : null}
          {query.yearMax != null ? (
            <input type="hidden" name="yearMax" value={query.yearMax} />
          ) : null}
          {query.kmMin != null ? (
            <input type="hidden" name="kmMin" value={query.kmMin} />
          ) : null}
          {query.kmMax != null ? (
            <input type="hidden" name="kmMax" value={query.kmMax} />
          ) : null}
          {query.fuel.map((f) => (
            <input key={`fuel-${f}`} type="hidden" name="fuel" value={f} />
          ))}
          {query.transmission.map((t) => (
            <input key={`tr-${t}`} type="hidden" name="transmission" value={t} />
          ))}
          {query.bodyType.map((b) => (
            <input key={`body-${b}`} type="hidden" name="bodyType" value={b} />
          ))}
          {query.sort !== "newest" ? (
            <input type="hidden" name="sort" value={query.sort} />
          ) : null}
        </form>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
          <button
            type="button"
            className={`${pillClass} col-span-2 md:col-span-1`}
            onClick={() => setSheet("brand")}
          >
            <IconGrid size={16} />
            Brand
          </button>
          <button type="button" className={pillClass} onClick={() => setSheet("body")}>
            <IconBody size={16} />
            Caroserie
          </button>
          <button type="button" className={pillClass} onClick={() => setSheet("fuel")}>
            <IconFuel size={16} />
            Combustibil
          </button>
          <button type="button" className={pillClass} onClick={() => setSheet("price")}>
            <IconTag size={16} />
            Preț
          </button>
          <button type="button" className={pillClass} onClick={() => setSheet("year")}>
            <IconCalendar size={16} />
            An
          </button>
          <button
            ref={triggerRef}
            type="button"
            className="col-span-2 inline-flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)] md:col-span-1 md:min-h-12"
            style={{ backgroundColor: "var(--sf-accent)" }}
            aria-expanded={open}
            aria-controls={panelId}
            aria-haspopup="dialog"
            onClick={openDrawer}
          >
            <IconSliders size={18} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">Toate filtrele</span>
              <span className="mt-0.5 block truncate text-xs font-medium text-white/85">
                {triggerHint}
              </span>
            </span>
            <IconChevronRight size={18} />
          </button>
        </div>
      </div>

      {sheet ? (
        <CatalogQuickSheet
          kind={sheet}
          query={query}
          brands={brands}
          priceCeiling={priceCeiling}
          yearFloor={yearFloor}
          yearCeiling={yearCeiling}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end">
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
            className="catalog-filter-drawer-panel relative z-10 flex h-full w-full max-w-[480px] flex-col bg-white shadow-xl outline-none"
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-[var(--sf-border)] px-3 py-3">
              <button
                type="button"
                onClick={close}
                className="inline-flex size-10 items-center justify-center rounded-lg border border-[var(--sf-accent)] text-[var(--sf-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
                aria-label="Înapoi"
              >
                <IconChevronLeft size={18} />
              </button>
              <h2
                id={titleId}
                className="min-w-0 flex-1 text-center text-base font-bold text-[var(--sf-text)]"
              >
                Filtrează
              </h2>
              {hasFilters ? (
                <Link
                  href={resetCatalogHref()}
                  className="shrink-0 text-sm font-medium text-[var(--sf-accent)] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
                  onClick={close}
                >
                  Șterge opțiunile
                </Link>
              ) : (
                <span className="inline-block w-[7.5rem]" aria-hidden />
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white px-4 py-4 pb-28">
              <CatalogFilters
                query={query}
                idPrefix="catalog-drawer"
                formId={`${panelId}-form`}
                submitLabel="Vezi Rezultatele"
                hideActions
                className="flex flex-col gap-3 border-0 bg-transparent p-0"
              />
            </div>

            <div
              className="absolute inset-x-0 bottom-0 z-20 border-t border-[var(--sf-border)] bg-white px-4 pt-3"
              style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            >
              <button
                type="submit"
                form={`${panelId}-form`}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
                style={{ backgroundColor: "var(--sf-accent)" }}
              >
                Vezi Rezultatele
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
