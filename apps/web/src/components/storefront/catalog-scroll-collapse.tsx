"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

const FALLBACK_HEADER_OFFSET = 56;
/** Pixels the filter card rises before it pins. */
const LIFT_DISTANCE = 10;
/** Scroll range for that short lift. */
const LIFT_RANGE = 40;

function headerOffsetPx(): number {
  const header = document.querySelector<HTMLElement>("header.sticky");
  if (!header) return FALLBACK_HEADER_OFFSET;
  return Math.round(header.getBoundingClientRect().height);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function nearlyEqual(a: number, b: number, eps = 0.5): boolean {
  return Math.abs(a - b) <= eps;
}

type CatalogScrollCollapseProps = {
  /** Scrolls away under the header (e.g. În stoc tabs) — never pinned. */
  lead?: ReactNode;
  /** Search + filter pills — lifts, pins, then fades as results cover it. */
  filters: ReactNode;
  children: ReactNode;
};

/**
 * Catalog chrome on scroll:
 * - `lead` scrolls away normally
 * - `filters` lift → pin under header → opacity as results cover
 *
 * Lift/opacity use CSS vars on the host (no React re-render per frame).
 */
export function CatalogScrollCollapse({
  lead,
  filters,
  children,
}: CatalogScrollCollapseProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const filterHostRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const filterHRef = useRef(0);
  const fixedBoxRef = useRef({ left: 0, width: 0 });
  const rafRef = useRef(0);
  const pinnedRef = useRef(false);
  const headerHRef = useRef(FALLBACK_HEADER_OFFSET);
  const liftRef = useRef(0);
  const opacityRef = useRef(1);

  const [pinned, setPinned] = useState(false);
  const [headerH, setHeaderH] = useState(FALLBACK_HEADER_OFFSET);
  const [filterH, setFilterH] = useState(0);
  const [fixedBox, setFixedBox] = useState({ left: 0, width: 0 });

  const writeChromeVars = (liftPx: number, opacityValue: number) => {
    const host = filterHostRef.current;
    if (!host) return;
    host.style.setProperty(
      "--catalog-filter-lift",
      pinnedRef.current ? "0px" : `${liftPx}px`,
    );
    host.style.setProperty("--catalog-filter-opacity", String(opacityValue));
    host.style.pointerEvents =
      pinnedRef.current && opacityValue < 0.85 ? "none" : "";
  };

  const sync = useEffectEvent(() => {
    const sentinel = sentinelRef.current;
    const filterHost = filterHostRef.current;
    const content = contentRef.current;
    if (!sentinel || !filterHost || !content) return;

    const topOffset = headerOffsetPx();
    const reduceMotion = prefersReducedMotion();
    const sentTop = sentinel.getBoundingClientRect().top;
    const scrolled = Math.max(0, topOffset - sentTop);
    const shouldPin = sentTop <= topOffset + 0.5;

    if (!shouldPin) {
      const r = filterHost.getBoundingClientRect();
      const nextH = Math.round(r.height);
      const nextBox = { left: Math.round(r.left), width: Math.round(r.width) };
      if (filterHRef.current !== nextH) {
        filterHRef.current = nextH;
        setFilterH(nextH);
      }
      if (
        !nearlyEqual(fixedBoxRef.current.left, nextBox.left) ||
        !nearlyEqual(fixedBoxRef.current.width, nextBox.width)
      ) {
        fixedBoxRef.current = nextBox;
        setFixedBox(nextBox);
      }
    } else if (filterHRef.current === 0) {
      const r = filterHost.getBoundingClientRect();
      const nextH = Math.round(r.height);
      filterHRef.current = nextH;
      setFilterH(nextH);
    }

    if (!nearlyEqual(headerHRef.current, topOffset, 2)) {
      headerHRef.current = topOffset;
      setHeaderH(topOffset);
    }

    const pinChanged = pinnedRef.current !== shouldPin;
    if (pinChanged) {
      pinnedRef.current = shouldPin;
      setPinned(shouldPin);

      if (shouldPin) {
        const main = document.querySelector<HTMLElement>("main");
        if (main) {
          const mr = main.getBoundingClientRect();
          const cs = getComputedStyle(main);
          const pl = Number.parseFloat(cs.paddingLeft) || 0;
          const pr = Number.parseFloat(cs.paddingRight) || 0;
          const nextBox = {
            left: Math.round(mr.left + pl),
            width: Math.max(0, Math.round(mr.width - pl - pr)),
          };
          fixedBoxRef.current = nextBox;
          setFixedBox(nextBox);
        }
      }
    }

    let nextLift = 0;
    if (!reduceMotion) {
      if (scrolled <= 0) nextLift = 0;
      else if (scrolled < LIFT_RANGE) nextLift = (scrolled / LIFT_RANGE) * LIFT_DISTANCE;
      else nextLift = LIFT_DISTANCE;
    }

    // Opacity only after the filter chrome has reached the header (lead already gone).
    const filterRect = filterHost.getBoundingClientRect();
    const contentTop = content.getBoundingClientRect().top;
    const overlap = filterRect.bottom - contentTop;

    let nextOpacity = 1;
    if (shouldPin && overlap > 0) {
      const fadeRange = Math.max(filterRect.height * 0.85, 48);
      nextOpacity = Math.max(0, Math.min(1, 1 - overlap / fadeRange));
    }

    const liftChanged = !nearlyEqual(liftRef.current, nextLift, 0.15);
    const opacityChanged = !nearlyEqual(opacityRef.current, nextOpacity, 0.02);
    if (liftChanged) liftRef.current = nextLift;
    if (opacityChanged) opacityRef.current = nextOpacity;
    if (liftChanged || opacityChanged || pinChanged) {
      writeChromeVars(nextLift, nextOpacity);
    }
  });

  useEffect(() => {
    const schedule = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = 0;
        sync();
      });
    };

    sync();

    const scrollOpts: AddEventListenerOptions = { passive: true, capture: true };
    window.addEventListener("scroll", schedule, scrollOpts);
    document.addEventListener("scroll", schedule, scrollOpts);
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule, { passive: true });

    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      window.removeEventListener("scroll", schedule, scrollOpts);
      document.removeEventListener("scroll", schedule, scrollOpts);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
    };
  }, []);

  const box = fixedBox.width > 0 ? fixedBox : fixedBoxRef.current;
  const height = filterH > 0 ? filterH : filterHRef.current;

  const pinStyle: CSSProperties | undefined = pinned
    ? {
        position: "fixed",
        top: headerH,
        left: box.left,
        width: box.width || "100%",
        zIndex: 1,
      }
    : undefined;

  return (
    <div className="relative flex min-w-0 flex-col gap-3">
      {lead ? <div className="relative z-[1] min-w-0">{lead}</div> : null}

      <div ref={sentinelRef} className="pointer-events-none h-0 w-full" aria-hidden />

      {pinned ? (
        <div className="pointer-events-none shrink-0" style={{ height }} aria-hidden />
      ) : null}

      <div
        ref={filterHostRef}
        className="catalog-scroll-filter-host"
        style={pinStyle}
      >
        {filters}
      </div>

      <div ref={contentRef} className="relative z-10 flex min-w-0 flex-col">
        {children}
      </div>
    </div>
  );
}
