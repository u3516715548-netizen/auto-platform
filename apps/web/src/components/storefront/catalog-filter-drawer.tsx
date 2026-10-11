"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
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
import type { QuickSheetKind } from "@/components/storefront/catalog-quick-sheets";
import { CatalogSheetShell } from "@/components/storefront/catalog-sheet-shell";
import {
  IconBody,
  IconCalendar,
  IconChevronRight,
  IconFuel,
  IconGrid,
  IconSearch,
  IconSliders,
  IconTag,
} from "@/components/storefront/icons";

/** Heavy filter panels — loaded when opened (keeps catalog first paint lighter). */
const CatalogFilters = dynamic(
  () =>
    import("@/components/storefront/catalog-filters").then((m) => m.CatalogFilters),
  { ssr: false },
);
const CatalogQuickSheet = dynamic(
  () =>
    import("@/components/storefront/catalog-quick-sheets").then(
      (m) => m.CatalogQuickSheet,
    ),
  { ssr: false },
);

type CatalogFilterDrawerProps = {
  query: CatalogQuery;
  brands?: string[];
  priceCeiling?: number;
  yearFloor?: number;
  yearCeiling?: number;
  /** When false, stock tabs are rendered outside (scroll-away lead). Default true. */
  showStockToggle?: boolean;
};

/** În stoc / Urmează în stoc — can sit in the scroll-away lead or inside the filter card. */
export function CatalogStockAvailabilityToggle({
  framed = false,
}: {
  /** Own white card (lead above pinned filters). */
  framed?: boolean;
}) {
  const toggle = (
    <div
      className="mx-auto flex w-full max-w-md rounded-full bg-[var(--sf-surface-muted)] p-1"
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
  );

  if (!framed) return toggle;

  return (
    <div className="sf-solid-card rounded-2xl border border-[var(--sf-border)] p-3 md:p-4">
      {toggle}
    </div>
  );
}

function listFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(CATALOG_DRAWER_FOCUSABLE_SELECTOR),
  ).filter((el) => {
    if (el.hasAttribute("disabled")) return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    return el.getClientRects().length > 0;
  });
}

function useIsMdUp() {
  const [isMd, setIsMd] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsMd(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return isMd;
}

const pillClass =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--sf-border)] bg-white px-3 text-sm font-semibold text-[var(--sf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]";

const pillActiveClass =
  "border-[var(--sf-accent)] bg-[color-mix(in_srgb,var(--sf-accent)_8%,white)] text-[var(--sf-text)]";

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
 * Catalog filter chrome — tabs, search, quick pills;
 * desktop: full-width overlay dropdowns over the vehicle grid;
 * mobile: sheets / ~80% bottom drawer for all filters.
 */
export function CatalogFilterDrawer({
  query,
  brands = DEFAULT_BRANDS,
  priceCeiling = 114_000,
  yearFloor = 2001,
  yearCeiling = new Date().getFullYear(),
  showStockToggle = true,
}: CatalogFilterDrawerProps) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState<QuickSheetKind | null>(null);
  const isMdUp = useIsMdUp();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inlineQuickRef = useRef<HTMLDivElement>(null);
  const inlineAllRef = useRef<HTMLDivElement>(null);
  const filtersRootRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const panelId = `catalog-filter-drawer-${reactId.replace(/:/g, "")}`;
  const titleId = `${panelId}-title`;
  const activeCount = countActiveCatalogFilters(query);
  const hasFilters = catalogQueryHasFilterChips(query);

  function closeAll() {
    setOpen(false);
    setSheet(null);
  }

  function close() {
    setOpen(false);
  }

  function openDrawer() {
    setSheet(null);
    setOpen((prev) => !prev);
  }

  function toggleSheet(kind: QuickSheetKind) {
    setOpen(false);
    setSheet((prev) => (prev === kind ? null : kind));
  }

  const mobileOverlayOpen = !isMdUp && (open || sheet != null);

  useEffect(() => {
    if (!mobileOverlayOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = catalogDrawerBodyOverflow(true);
    return () => {
      document.body.style.overflow = previousOverflow || catalogDrawerBodyOverflow(false);
    };
  }, [mobileOverlayOpen]);

  // Raise sticky filter chrome above results while any sheet/drawer is open
  // (otherwise CatalogScrollCollapse z-0 traps fixed overlays under the grid).
  const chromeElevated = open || sheet != null;
  useEffect(() => {
    if (!chromeElevated) {
      delete document.body.dataset.sfCatalogOverlay;
      return;
    }
    document.body.dataset.sfCatalogOverlay = "open";
    return () => {
      delete document.body.dataset.sfCatalogOverlay;
    };
  }, [chromeElevated]);

  useEffect(() => {
    if (!open || isMdUp) return;

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
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [open, isMdUp]);

  useEffect(() => {
    if (!isMdUp) return;
    if (!open && !sheet) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAll();
      }
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      // Ignore the same gesture that opened the panel (button is inside root).
      if (filtersRootRef.current?.contains(target)) return;
      closeAll();
    }

    // Defer attach so the opening click does not immediately close the panel.
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isMdUp, open, sheet]);

  const triggerHint =
    activeCount > 0
      ? `${activeCount} ${activeCount === 1 ? "filtru activ" : "filtre active"}`
      : "Cutie · km · TVA · scaune · dotări";

  return (
    <div
      ref={filtersRootRef}
      className={`relative ${mobileOverlayOpen ? "z-[100]" : "z-30"}`}
    >
      <div className="sf-solid-card flex flex-col gap-3 rounded-2xl border border-[var(--sf-border)] p-3 md:gap-4 md:p-5">
        {showStockToggle ? <CatalogStockAvailabilityToggle /> : null}

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
            className="catalog-filter-mobile-field min-h-12 w-full rounded-2xl border border-[var(--sf-border)] bg-[var(--sf-surface-muted)] py-2.5 pr-3 pl-11 text-base text-[var(--sf-text)] placeholder:text-[var(--sf-text-muted)] focus:border-[var(--sf-accent)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--sf-accent)_25%,transparent)] md:text-sm"
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
            className={`${pillClass} col-span-2 md:col-span-1 ${sheet === "brand" ? pillActiveClass : ""}`}
            aria-expanded={sheet === "brand"}
            onClick={() => toggleSheet("brand")}
          >
            <IconGrid size={16} />
            Brand
          </button>
          <button
            type="button"
            className={`${pillClass} ${sheet === "body" ? pillActiveClass : ""}`}
            aria-expanded={sheet === "body"}
            onClick={() => toggleSheet("body")}
          >
            <IconBody size={16} />
            Caroserie
          </button>
          <button
            type="button"
            className={`${pillClass} ${sheet === "fuel" ? pillActiveClass : ""}`}
            aria-expanded={sheet === "fuel"}
            onClick={() => toggleSheet("fuel")}
          >
            <IconFuel size={16} />
            Combustibil
          </button>
          <button
            type="button"
            className={`${pillClass} ${sheet === "price" ? pillActiveClass : ""}`}
            aria-expanded={sheet === "price"}
            onClick={() => toggleSheet("price")}
          >
            <IconTag size={16} />
            Preț
          </button>
          <button
            type="button"
            className={`${pillClass} ${sheet === "year" ? pillActiveClass : ""}`}
            aria-expanded={sheet === "year"}
            onClick={() => toggleSheet("year")}
          >
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
            aria-haspopup={isMdUp ? "true" : "dialog"}
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

      {/* Outside .sf-solid-card — card has overflow:hidden and would clip overlays */}
      {sheet && isMdUp ? (
        <div className="absolute inset-x-0 top-full z-40 mt-2">
          <CatalogQuickSheet
            key={sheet}
            kind={sheet}
            query={query}
            brands={brands}
            priceCeiling={priceCeiling}
            yearFloor={yearFloor}
            yearCeiling={yearCeiling}
            onClose={() => setSheet(null)}
            variant="inline"
            panelRef={inlineQuickRef}
          />
        </div>
      ) : null}

      {open && isMdUp ? (
        <div
          ref={inlineAllRef}
          id={panelId}
          className="absolute inset-x-0 top-full z-40 mt-2"
          role="region"
          aria-labelledby={titleId}
        >
          <div className="flex max-h-[min(32rem,70vh)] w-full flex-col overflow-hidden rounded-2xl border border-[var(--sf-border)] bg-white shadow-lg">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--sf-border)] px-4 py-3">
              <h2 id={titleId} className="text-lg font-bold text-[var(--sf-text)]">
                Toate filtrele
              </h2>
              <div className="flex items-center gap-2">
                {hasFilters ? (
                  <Link
                    href={resetCatalogHref()}
                    prefetch={false}
                    className="text-sm font-medium text-[var(--sf-accent)] underline underline-offset-2"
                    onClick={close}
                  >
                    Șterge
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex min-h-10 items-center rounded-full border border-[var(--sf-border)] px-3 text-sm font-semibold text-[var(--sf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
                >
                  Anulează
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <CatalogFilters
                query={query}
                idPrefix="catalog-drawer-desktop"
                formId={`${panelId}-form`}
                submitLabel="Aplică filtrele"
                hideActions
                className="flex flex-col gap-3 border-0 bg-transparent p-0"
              />
            </div>
            <div className="shrink-0 border-t border-[var(--sf-border)] bg-white px-4 py-3">
              <button
                type="submit"
                form={`${panelId}-form`}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
                style={{ backgroundColor: "var(--sf-accent)" }}
              >
                Aplică filtrele
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {sheet && !isMdUp ? (
        <CatalogQuickSheet
          kind={sheet}
          query={query}
          brands={brands}
          priceCeiling={priceCeiling}
          yearFloor={yearFloor}
          yearCeiling={yearCeiling}
          onClose={() => setSheet(null)}
          variant="overlay"
        />
      ) : null}

      {open && !isMdUp ? (
        <CatalogSheetShell
          title="Filtrează"
          titleId={titleId}
          panelId={panelId}
          panelRef={panelRef}
          onClose={close}
          footer={
            <button
              type="submit"
              form={`${panelId}-form`}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
              style={{ backgroundColor: "var(--sf-accent)" }}
            >
              Vezi rezultatele
            </button>
          }
        >
          {hasFilters ? (
            <div className="mb-3 border-b border-[var(--sf-border)] pb-2 text-center">
              <Link
                href={resetCatalogHref()}
                prefetch={false}
                className="text-sm font-medium text-[var(--sf-accent)] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
                onClick={close}
              >
                Șterge opțiunile
              </Link>
            </div>
          ) : null}
          <CatalogFilters
            query={query}
            idPrefix="catalog-drawer"
            formId={`${panelId}-form`}
            submitLabel="Vezi rezultatele"
            hideActions
            className="flex flex-col gap-3 border-0 bg-transparent p-0"
          />
        </CatalogSheetShell>
      ) : null}
    </div>
  );
}
