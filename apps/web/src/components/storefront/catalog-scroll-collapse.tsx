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
const LIFT_DISTANCE = 14;
/** Scroll range for that short lift. */
const LIFT_RANGE = 32;

function headerOffsetPx(): number {
  const header = document.querySelector<HTMLElement>("header.sticky");
  if (!header) return FALLBACK_HEADER_OFFSET;
  return Math.round(header.getBoundingClientRect().height);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type CatalogScrollCollapseProps = {
  filters: ReactNode;
  children: ReactNode;
};

/**
 * Mobile catalog chrome:
 * 1) filter block lifts a few px while scrolling
 * 2) then stays fixed under the site header (position:fixed — reliable vs sticky)
 * 3) opacity falls toward 0 as vehicle cards cover it
 */
export function CatalogScrollCollapse({
  filters,
  children,
}: CatalogScrollCollapseProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const filterHostRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [lift, setLift] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [pinned, setPinned] = useState(false);
  const [headerH, setHeaderH] = useState(FALLBACK_HEADER_OFFSET);
  const [filterH, setFilterH] = useState(0);
  const [fixedBox, setFixedBox] = useState({ left: 0, width: 0 });

  const sync = useEffectEvent(() => {
    const sentinel = sentinelRef.current;
    const filterHost = filterHostRef.current;
    const content = contentRef.current;
    if (!sentinel || !filterHost || !content) return;

    const topOffset = headerOffsetPx();
    setHeaderH(topOffset);

    const reduce = prefersReducedMotion();
    const sentTop = sentinel.getBoundingClientRect().top;
    const scrolled = Math.max(0, topOffset - sentTop);
    const shouldPin = sentTop <= topOffset;

    // Measure layout box while still in-flow (or use last known height when pinned).
    if (!shouldPin || filterH === 0) {
      const r = filterHost.getBoundingClientRect();
      setFilterH(Math.round(r.height));
      setFixedBox({ left: Math.round(r.left), width: Math.round(r.width) });
    } else {
      // Keep horizontal alignment with main column while pinned.
      const main = document.querySelector<HTMLElement>("main");
      if (main) {
        const mr = main.getBoundingClientRect();
        const cs = getComputedStyle(main);
        const pl = Number.parseFloat(cs.paddingLeft) || 0;
        const pr = Number.parseFloat(cs.paddingRight) || 0;
        setFixedBox({
          left: Math.round(mr.left + pl),
          width: Math.round(mr.width - pl - pr),
        });
      }
    }

    setPinned(shouldPin);

    if (reduce) {
      setLift(0);
      setOpacity(1);
      return;
    }

    // 1) Short lift, then hold at LIFT_DISTANCE while pinned.
    if (scrolled <= 0) {
      setLift(0);
    } else if (scrolled < LIFT_RANGE) {
      setLift((scrolled / LIFT_RANGE) * LIFT_DISTANCE);
    } else {
      setLift(LIFT_DISTANCE);
    }

    // 2) Opacity only from how much the cards cover the filter.
    const filterRect = filterHost.getBoundingClientRect();
    const contentTop = content.getBoundingClientRect().top;
    const overlap = filterRect.bottom - contentTop;

    if (overlap <= 0) {
      setOpacity(1);
      return;
    }

    const fadeRange = Math.max(filterRect.height, 1);
    setOpacity(Math.max(0, 1 - overlap / fadeRange));
  });

  useEffect(() => {
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sync]);

  const filterVars = {
    ["--catalog-filter-lift" as string]: pinned ? "0px" : `${lift}px`,
    ["--catalog-filter-opacity" as string]: String(opacity),
  } satisfies CSSProperties;

  const overlapping = opacity < 0.98;

  const pinStyle: CSSProperties | undefined = pinned
    ? {
        position: "fixed",
        top: Math.max(0, headerH - lift),
        left: fixedBox.left,
        width: fixedBox.width,
        zIndex: 0,
      }
    : undefined;

  return (
    <div className="relative flex min-w-0 flex-col">
      <div ref={sentinelRef} className="pointer-events-none h-0 w-full" aria-hidden />

      {/* Keeps document flow height when the filter is position:fixed */}
      {pinned ? (
        <div className="pointer-events-none shrink-0" style={{ height: filterH }} aria-hidden />
      ) : null}

      <div
        ref={filterHostRef}
        className="catalog-scroll-filter-host"
        style={{
          ...filterVars,
          ...pinStyle,
          pointerEvents: opacity < 0.12 ? "none" : undefined,
        }}
      >
        {filters}
      </div>

      <div
        ref={contentRef}
        className={`relative z-10 flex min-w-0 flex-col gap-4 bg-[var(--sf-bg,#ffffff)] pt-3 ${
          overlapping ? "shadow-[0_-12px_28px_rgba(24,24,27,0.08)]" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}
