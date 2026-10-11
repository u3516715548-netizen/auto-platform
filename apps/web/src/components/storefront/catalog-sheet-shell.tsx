"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { IconClose } from "@/components/storefront/icons";
import {
  clampSheetDragOffset,
  sheetDragVelocityPxPerMs,
  shouldCloseSheetFromDrag,
} from "@/lib/storefront/catalog-sheet-drag";

type CatalogSheetShellProps = {
  title: string;
  subtitle?: string;
  titleId?: string;
  /** Dialog element id (aria-controls from trigger). */
  panelId?: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  /** Optional external panel ref (focus trap). */
  panelRef?: RefObject<HTMLDivElement | null>;
};

/**
 * Mobile bottom sheet for catalog filters.
 * - Sheet sits above the tab bar via `--sf-mobile-nav-clearance` on the drag layer.
 * - Footer keeps a short theme-surface gap under the CTA (not nav clearance / safe-area).
 * - Nav stays above via CSS z-index (`body[data-sf-catalog-overlay]`).
 * - Drag handle / header swipe-down to dismiss (Pointer Events).
 * - Enter animation + drag translate share the drag layer; max-height uses dvh/svh only.
 */
export function CatalogSheetShell({
  title,
  subtitle,
  titleId,
  panelId,
  onClose,
  children,
  footer,
  panelRef,
}: CatalogSheetShellProps) {
  const localRef = useRef<HTMLDivElement>(null);
  const setPanelRef = useCallback(
    (node: HTMLDivElement | null) => {
      localRef.current = node;
      if (panelRef) {
        panelRef.current = node;
      }
    },
    [panelRef],
  );

  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartTime = useRef(0);
  const activePointer = useRef<number | null>(null);
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = localRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      panel.focus();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (
        previouslyFocused &&
        typeof previouslyFocused.focus === "function" &&
        document.contains(previouslyFocused)
      ) {
        previouslyFocused.focus();
      }
    };
  }, [onClose]);

  function endDrag(clientY: number) {
    if (activePointer.current == null) return;
    const deltaY = clampSheetDragOffset(clientY - dragStartY.current);
    const elapsed = performance.now() - dragStartTime.current;
    const velocityY = sheetDragVelocityPxPerMs(deltaY, elapsed);
    activePointer.current = null;
    setDragging(false);

    if (shouldCloseSheetFromDrag({ deltaY, velocityY })) {
      onClose();
      setDragY(0);
      return;
    }
    setDragY(0);
  }

  function onHeaderPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    activePointer.current = event.pointerId;
    dragStartY.current = event.clientY;
    dragStartTime.current = performance.now();
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onHeaderPointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (activePointer.current !== event.pointerId) return;
    setDragY(clampSheetDragOffset(event.clientY - dragStartY.current));
  }

  function onHeaderPointerUp(event: ReactPointerEvent<HTMLElement>) {
    if (activePointer.current !== event.pointerId) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // already released
    }
    endDrag(event.clientY);
  }

  function onHeaderPointerCancel(event: ReactPointerEvent<HTMLElement>) {
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    setDragging(false);
    setDragY(0);
  }

  // Cap with dvh/svh only — `min(80dvh, 100%)` is ignored when % is indefinite.
  const sheetMaxHeight = "min(80dvh, 100svh)";
  const dragOffsetStyle: CSSProperties = {
    transform: dragY > 0 ? `translate3d(0, ${dragY}px, 0)` : undefined,
    transition:
      dragging || reduceMotion.current
        ? "none"
        : "transform 220ms cubic-bezier(0.32, 0.72, 0, 1)",
  };

  return (
    <div
      className="catalog-filter-sheet-root fixed inset-0 z-[var(--sf-z-sheet,75)] flex items-end justify-center"
      data-catalog-sheet="open"
    >
      <button
        type="button"
        className="catalog-filter-drawer-backdrop absolute inset-0 z-0 bg-zinc-900/45"
        aria-label="Închide"
        onClick={onClose}
      />
      <div
        className="catalog-filter-sheet-drag relative z-10 w-full max-w-[480px]"
        style={{ maxHeight: sheetMaxHeight }}
        data-sheet-nav-clearance="true"
      >
        <div
          className="flex w-full flex-col"
          style={dragOffsetStyle}
          data-sheet-dragging={dragging ? "true" : "false"}
        >
          <div
            ref={setPanelRef}
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-label={titleId ? undefined : title}
            tabIndex={-1}
            className="catalog-filter-drawer-panel catalog-filter-sheet flex max-h-[min(80dvh,100svh)] w-full flex-col overflow-hidden rounded-t-3xl border border-[var(--sf-border)] border-b-0 bg-[var(--sf-surface)] shadow-xl outline-none"
          >
          <div
            className="relative flex shrink-0 touch-none items-start gap-3 px-4 pt-2 pb-2"
            onPointerDown={onHeaderPointerDown}
            onPointerMove={onHeaderPointerMove}
            onPointerUp={onHeaderPointerUp}
            onPointerCancel={onHeaderPointerCancel}
            data-sheet-drag-region="header"
          >
            <div
              role="button"
              tabIndex={0}
              className="absolute top-1.5 left-1/2 z-10 flex h-8 w-14 -translate-x-1/2 cursor-grab items-center justify-center active:cursor-grabbing"
              aria-label="Trage în jos pentru a închide"
              data-sheet-drag-handle="true"
              onKeyDown={(event) => {
                if (
                  event.key === "Escape" ||
                  event.key === "Enter" ||
                  event.key === " "
                ) {
                  event.preventDefault();
                  onClose();
                }
              }}
            >
              <span
                className="h-1 w-10 rounded-full bg-[var(--sf-border)]"
                aria-hidden
              />
            </div>
            <div className="min-w-0 flex-1 pt-5">
              <h2
                id={titleId}
                className="text-2xl font-bold tracking-tight text-[var(--sf-text)]"
              >
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-1 text-sm text-[var(--sf-text-muted)]">
                  {subtitle}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              onPointerDown={(event) => event.stopPropagation()}
              className="mt-4 inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-[var(--sf-border)] text-[var(--sf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
              aria-label="Închide"
              data-sheet-close="true"
            >
              <IconClose size={18} />
            </button>
          </div>

          <div className="catalog-filter-sheet-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
            {children}
          </div>

          <div className="catalog-filter-sheet-footer shrink-0 border-t border-[var(--sf-border)] bg-[var(--sf-surface)] px-4 pt-3 shadow-[0_-6px_16px_rgba(24,24,27,0.08)]">
            {footer}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
