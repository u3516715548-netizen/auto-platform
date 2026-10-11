"use client";

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
  CATALOG_VIEW_MODES,
  type CatalogViewMode,
} from "@/lib/storefront/catalog-view-mode";
import {
  CATALOG_TOOLBAR_MENU_PANEL_CLASS,
  CATALOG_TOOLBAR_MENU_Z,
  CATALOG_TOOLBAR_TRIGGER_CLASS,
  computeCatalogToolbarMenuBox,
  getCatalogToolbarMenuPortalRoot,
  type CatalogToolbarMenuBox,
} from "@/lib/storefront/catalog-toolbar-menu";
import {
  IconCheck,
  IconChevronDown,
  IconGrid,
  IconList,
} from "@/components/storefront/icons";

const VIEW_LABELS_RO: Record<CatalogViewMode, string> = {
  grid: "Grilă",
  list: "Listă",
};

type CatalogViewMenuProps = {
  viewMode: CatalogViewMode;
  onChange: (mode: CatalogViewMode) => void;
  hydrated?: boolean;
};

/**
 * Single accessible Grid/List dropdown — same chrome as CatalogSortMenu.
 */
export function CatalogViewMenu({
  viewMode,
  onChange,
  hydrated = true,
}: CatalogViewMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuBox, setMenuBox] = useState<CatalogToolbarMenuBox | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const reactId = useId();
  const listboxId = `catalog-view-menu-${reactId.replace(/:/g, "")}`;
  const activeIndex = Math.max(0, CATALOG_VIEW_MODES.indexOf(viewMode));
  const CurrentIcon = viewMode === "grid" ? IconGrid : IconList;

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
    setMenuBox(computeCatalogToolbarMenuBox(trigger.getBoundingClientRect()));
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
        const items = optionRefs.current.filter(Boolean) as HTMLButtonElement[];
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

  const menuStyle: CSSProperties | undefined = menuBox
    ? {
        position: "fixed",
        top: menuBox.top,
        bottom: menuBox.bottom,
        left: menuBox.left,
        width: menuBox.width,
        maxHeight: menuBox.maxHeight,
        zIndex: CATALOG_TOOLBAR_MENU_Z,
        backgroundColor: "#ffffff",
        color: "#18181b",
      }
    : undefined;

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1 md:flex-initial">
      <button
        ref={triggerRef}
        type="button"
        className={CATALOG_TOOLBAR_TRIGGER_CLASS}
        style={{ color: "var(--sf-accent)" }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={`Vizualizare: ${VIEW_LABELS_RO[viewMode]}. Deschide meniul.`}
        title={`Vizualizare: ${VIEW_LABELS_RO[viewMode]}`}
        data-catalog-view-trigger="true"
        data-catalog-view-mode={viewMode}
        data-hydrated={hydrated ? "true" : "false"}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <CurrentIcon size={14} className="shrink-0" />
        <span className="min-w-0 truncate">Vizualizare</span>
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
              aria-label="Mod vizualizare catalog"
              data-catalog-view-menu="true"
              data-placement={menuBox.placement}
              className={CATALOG_TOOLBAR_MENU_PANEL_CLASS}
              style={menuStyle}
            >
              {CATALOG_VIEW_MODES.map((mode, index) => {
                const selected = mode === viewMode;
                const OptionIcon = mode === "grid" ? IconGrid : IconList;
                return (
                  <li key={mode} role="presentation">
                    <button
                      ref={(node) => {
                        optionRefs.current[index] = node;
                      }}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      tabIndex={-1}
                      data-catalog-view-option={mode}
                      className={`flex min-h-10 w-full items-center gap-2 px-2.5 text-left text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--sf-accent)] ${
                        selected
                          ? "bg-[color-mix(in_srgb,var(--sf-accent)_12%,#ffffff)] text-[var(--sf-accent)]"
                          : "text-zinc-900 hover:bg-zinc-100"
                      }`}
                      onClick={() => {
                        onChange(mode);
                        setOpen(false);
                        setMenuBox(null);
                        triggerRef.current?.focus();
                      }}
                    >
                      <OptionIcon size={16} className="shrink-0" />
                      <span className="min-w-0 flex-1">{VIEW_LABELS_RO[mode]}</span>
                      <span className="inline-flex size-4 shrink-0 items-center justify-center text-[var(--sf-accent)]">
                        {selected ? <IconCheck size={14} /> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>,
            getCatalogToolbarMenuPortalRoot(),
          )
        : null}
    </div>
  );
}
