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
  ESTIMATE_MONTHLY_RATE_NOTE,
  estimateMonthlyRateEur,
  formatEstimateMonthlyRateEur,
} from "@/lib/storefront/storefront-vehicle-lite";
import { getCatalogToolbarMenuPortalRoot } from "@/lib/storefront/catalog-toolbar-menu";
import { IconInfo } from "@/components/storefront/icons";

type VehicleCardRateProps = {
  price: string;
  className?: string;
  /**
   * Mobile grid (2-col, &lt; md): hide text rate, show Info popover.
   * md+ keeps the full “Rate de la” block. List / desktop ignore this.
   */
  compactMobile?: boolean;
  /** Used in the Info button aria-label when compactMobile. */
  vehicleTitle?: string;
};

type RatePopoverBox = {
  top: number;
  left: number;
  width: number;
};

export function computeRatePopoverBox(rect: DOMRect): RatePopoverBox {
  const width = 176;
  const gap = 6;
  const viewW =
    typeof window !== "undefined" ? window.innerWidth : rect.right + width;
  const viewH =
    typeof window !== "undefined" ? window.innerHeight : rect.bottom + 120;
  const estimatedHeight = 112;
  const navClearance = 72;

  let left = rect.right - width;
  if (rect.left < viewW / 2) {
    left = rect.left;
  }
  left = Math.max(8, Math.min(left, viewW - width - 8));

  let top = rect.bottom + gap;
  if (
    top + estimatedHeight > viewH - navClearance &&
    rect.top > estimatedHeight + gap
  ) {
    top = Math.max(8, rect.top - estimatedHeight - gap);
  }

  return { top, left, width };
}

function stopCardNav(event: { preventDefault(): void; stopPropagation(): void }) {
  event.preventDefault();
  event.stopPropagation();
}

function stopBubble(event: { stopPropagation(): void }) {
  event.stopPropagation();
}

/**
 * Discrete “Rate de la” estimate for catalog cards (price ÷ 60).
 * In mobile grid compact mode, an Info button opens an accessible popover.
 */
export function VehicleCardRate({
  price,
  className = "",
  compactMobile = false,
  vehicleTitle,
}: VehicleCardRateProps) {
  const monthly = estimateMonthlyRateEur(price);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [box, setBox] = useState<RatePopoverBox | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const panelId = `vehicle-card-rate-${reactId.replace(/:/g, "")}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setBox(null);
    triggerRef.current?.focus();
  }, []);

  const updateBox = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    setBox(computeRatePopoverBox(trigger.getBoundingClientRect()));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updateBox();
    const onReposition = () => updateBox();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updateBox]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
      setBox(null);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, close]);

  if (monthly == null) return null;

  const formatted = formatEstimateMonthlyRateEur(monthly);
  const infoLabel = vehicleTitle
    ? `Vezi rata estimată pentru ${vehicleTitle}`
    : "Vezi rata estimată";

  const textBlock = (
    <div
      className={`min-w-0 text-right ${compactMobile ? "hidden md:block" : ""} ${className}`}
      data-catalog-rate="text"
    >
      <p className="text-[11px] font-medium tracking-wide text-[var(--sf-text-muted)] uppercase">
        Rate de la
      </p>
      <p className="text-sm font-semibold text-[var(--sf-text)] tabular-nums">
        {formatted}
        <span className="text-[var(--sf-text-muted)]" title={ESTIMATE_MONTHLY_RATE_NOTE}>
          *
        </span>
      </p>
      <span className="sr-only">{ESTIMATE_MONTHLY_RATE_NOTE}</span>
    </div>
  );

  if (!compactMobile) {
    return textBlock;
  }

  const panelStyle: CSSProperties | undefined = box
    ? {
        position: "fixed",
        top: box.top,
        left: box.left,
        width: box.width,
        zIndex: 130,
      }
    : undefined;

  return (
    <div className={`relative shrink-0 ${className}`}>
      {textBlock}
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex size-9 items-center justify-center rounded-full border border-[var(--sf-border)] bg-[var(--sf-surface)] text-[var(--sf-text-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)] md:hidden"
        style={{ color: "var(--sf-accent)" }}
        aria-label={infoLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        data-catalog-rate-info="true"
        title={infoLabel}
        onClick={(event) => {
          stopCardNav(event);
          if (open) {
            close();
            return;
          }
          const trigger = triggerRef.current;
          if (trigger) {
            setBox(computeRatePopoverBox(trigger.getBoundingClientRect()));
          }
          setOpen(true);
        }}
        onMouseDown={stopBubble}
        onPointerDown={stopBubble}
      >
        <IconInfo size={16} className="shrink-0" />
      </button>

      {mounted && open && box && panelStyle
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-label={`Rată estimată${vehicleTitle ? ` — ${vehicleTitle}` : ""}`}
              data-catalog-rate-popover="true"
              className="rounded-xl border border-[var(--sf-border)] bg-[var(--sf-surface)] px-3 py-2.5 text-[var(--sf-text)] shadow-[0_8px_24px_rgba(24,24,27,0.16)] motion-safe:transition-opacity motion-safe:duration-150 motion-reduce:transition-none"
              style={panelStyle}
              onClick={stopCardNav}
              onMouseDown={stopBubble}
              onPointerDown={stopBubble}
            >
              <p className="text-[11px] font-medium tracking-wide text-[var(--sf-text-muted)] uppercase">
                Rate de la
              </p>
              <p className="text-sm font-semibold tabular-nums text-[var(--sf-text)]">
                {formatted}
                <span className="text-[var(--sf-text-muted)]">*</span>
              </p>
              <p className="mt-1 text-[11px] leading-snug text-[var(--sf-text-muted)]">
                {ESTIMATE_MONTHLY_RATE_NOTE}
              </p>
            </div>,
            getCatalogToolbarMenuPortalRoot(),
          )
        : null}
    </div>
  );
}
