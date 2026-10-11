"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import {
  buildCatalogHref,
  CATALOG_SORT_LABELS_RO,
  CATALOG_SORT_VALUES,
  type CatalogQuery,
  type CatalogSort,
} from "@/lib/storefront/catalog-query";
import { IconCheck, IconChevronDown, IconSort } from "@/components/storefront/icons";

export const CATALOG_SORT_SHORT_LABELS_RO: Record<CatalogSort, string> = {
  newest: "Recente",
  price_asc: "Preț ↑",
  price_desc: "Preț ↓",
  year_desc: "An ↓",
  mileage_asc: "Km ↑",
};

type CatalogSortMenuProps = {
  query: CatalogQuery;
};

type MenuBox = {
  placement: "below" | "above";
  /** CSS `top` when below; unused when above. */
  top: number | "auto";
  /** CSS `bottom` when above; unused when below. */
  bottom: number | "auto";
  left: number;
  width: number;
  maxHeight: number;
};

/**
 * Accessible sort dropdown — options match URL-supported CatalogSort values only.
 * Menu uses fixed positioning so it is not clipped by filter chrome stacking.
 */
export function CatalogSortMenu({ query }: CatalogSortMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuBox, setMenuBox] = useState<MenuBox | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const reactId = useId();
  const listboxId = `catalog-sort-menu-${reactId.replace(/:/g, "")}`;
  const activeIndex = Math.max(0, CATALOG_SORT_VALUES.indexOf(query.sort));

  const close = useCallback(() => {
    setOpen(false);
    setMenuBox(null);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuBox = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const navClearance = 80;
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom - navClearance;
    const spaceAbove = rect.top - 8;
    const preferredMax = 288;
    const placeAbove = spaceBelow < 200 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(
      preferredMax,
      Math.max(120, placeAbove ? spaceAbove - gap : spaceBelow - gap),
    );
    setMenuBox({
      placement: placeAbove ? "above" : "below",
      top: placeAbove ? "auto" : rect.bottom + gap,
      bottom: placeAbove ? window.innerHeight - rect.top + gap : "auto",
      left: rect.left,
      width: Math.max(rect.width, 176),
      maxHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuBox();
    const onReposition = () => updateMenuBox();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updateMenuBox]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const items = optionRefs.current.filter(Boolean) as HTMLAnchorElement[];
        if (items.length === 0) return;
        const current = items.findIndex((el) => el === document.activeElement);
        const delta = event.key === "ArrowDown" ? 1 : -1;
        const next =
          current < 0
            ? event.key === "ArrowDown"
              ? 0
              : items.length - 1
            : (current + delta + items.length) % items.length;
        items[next]?.focus();
      }
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
      setMenuBox(null);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const preferred =
      optionRefs.current[activeIndex] ?? optionRefs.current[0] ?? null;
    preferred?.focus();
  }, [open, activeIndex, menuBox]);

  const shortLabel = CATALOG_SORT_SHORT_LABELS_RO[query.sort];
  const fullLabel = CATALOG_SORT_LABELS_RO[query.sort];

  const menuStyle: CSSProperties | undefined = menuBox
    ? {
        position: "fixed",
        top: menuBox.top,
        bottom: menuBox.bottom,
        left: menuBox.left,
        width: menuBox.width,
        maxHeight: menuBox.maxHeight,
        zIndex: 120,
      }
    : undefined;

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1 sm:flex-initial">
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex min-h-10 w-full min-w-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--sf-border)] bg-[var(--sf-surface-muted)] px-2.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
        style={{ color: "var(--sf-accent)" }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={`Sortare: ${fullLabel}. Deschide meniul de sortare.`}
        title={`Sortare: ${fullLabel}`}
        data-catalog-sort-trigger="true"
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <IconSort size={14} className="shrink-0" />
        <span className="min-w-0 truncate">{shortLabel}</span>
        <IconChevronDown
          size={14}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {mounted && open && menuBox && menuStyle
        ? createPortal(
            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label="Opțiuni de sortare"
              data-catalog-sort-menu="true"
              data-placement={menuBox.placement}
              className="overflow-y-auto overscroll-contain rounded-xl border border-[var(--sf-border)] bg-[var(--sf-surface)] py-1 shadow-lg"
              style={menuStyle}
            >
              {CATALOG_SORT_VALUES.map((value, index) => {
                const selected = value === query.sort;
                const href = buildCatalogHref({ ...query, sort: value, page: 1 });
                return (
                  <li key={value} role="presentation">
                    <Link
                      ref={(node) => {
                        optionRefs.current[index] = node;
                      }}
                      href={href}
                      prefetch={false}
                      role="option"
                      aria-selected={selected}
                      tabIndex={-1}
                      data-catalog-sort-option={value}
                      className="flex min-h-10 items-center gap-2 px-3 text-sm font-medium text-[var(--sf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--sf-accent)] hover:bg-[var(--sf-surface-muted)]"
                      onClick={() => {
                        setOpen(false);
                        setMenuBox(null);
                      }}
                    >
                      <span className="inline-flex size-4 shrink-0 items-center justify-center text-[var(--sf-accent)]">
                        {selected ? <IconCheck size={14} /> : null}
                      </span>
                      <span>{CATALOG_SORT_LABELS_RO[value]}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
