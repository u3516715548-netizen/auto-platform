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
 * Catalog filter chrome on scroll (esp. real mobile Safari/Chrome):
 * 1) lifts a few px
 * 2) pins fixed under the site header
 * 3) opacity → 0 as the results/cards cover it
 *
 * Uses rAF + scroll on window/document/visualViewport — window-only scroll
 * is unreliable on iOS while the address bar moves.
 */
export function CatalogScrollCollapse({
  filters,
  children,
}: CatalogScrollCollapseProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const filterHostRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const filterHRef = useRef(0);
  const fixedBoxRef = useRef({ left: 0, width: 0 });
  const rafRef = useRef(0);

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
    const reduceMotion = prefersReducedMotion();
    const sentTop = sentinel.getBoundingClientRect().top;
    const scrolled = Math.max(0, topOffset - sentTop);
    const shouldPin = sentTop <= topOffset + 0.5;

    // Measure in-flow box; when pinned, align to main padding box.
    if (!shouldPin) {
      const r = filterHost.getBoundingClientRect();
      const nextH = Math.round(r.height);
      const nextBox = { left: Math.round(r.left), width: Math.round(r.width) };
      filterHRef.current = nextH;
      fixedBoxRef.current = nextBox;
      setFilterH(nextH);
      setFixedBox(nextBox);
    } else {
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
      if (filterHRef.current === 0) {
        const r = filterHost.getBoundingClientRect();
        filterHRef.current = Math.round(r.height);
        setFilterH(filterHRef.current);
      }
    }

    setHeaderH(topOffset);
    setPinned(shouldPin);

    // Lift (skip translate when OS asks for reduced motion).
    let nextLift = 0;
    if (!reduceMotion) {
      if (scrolled <= 0) nextLift = 0;
      else if (scrolled < LIFT_RANGE) nextLift = (scrolled / LIFT_RANGE) * LIFT_DISTANCE;
      else nextLift = LIFT_DISTANCE;
    }
    setLift(nextLift);

    // Opacity from coverage — still runs with reduced motion (no transform).
    const filterRect = filterHost.getBoundingClientRect();
    const contentTop = content.getBoundingClientRect().top;
    const overlap = filterRect.bottom - contentTop;

    if (overlap <= 0) {
      setOpacity(1);
      return;
    }

    const fadeRange = Math.max(filterRect.height, 1);
    setOpacity(Math.max(0, Math.min(1, 1 - overlap / fadeRange)));
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
    // iOS address-bar / pinch viewport changes.
    window.visualViewport?.addEventListener("scroll", schedule, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule, { passive: true });
    // Kick sync during touch drag (some WebKits delay window scroll).
    window.addEventListener("touchmove", schedule, { passive: true });

    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      window.removeEventListener("scroll", schedule, scrollOpts);
      document.removeEventListener("scroll", schedule, scrollOpts);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.removeEventListener("touchmove", schedule);
    };
  }, [sync]);

  const filterVars = {
    ["--catalog-filter-lift" as string]: pinned ? "0px" : `${lift}px`,
    ["--catalog-filter-opacity" as string]: String(opacity),
  } satisfies CSSProperties;

  const overlapping = opacity < 0.98;
  const box = fixedBox.width > 0 ? fixedBox : fixedBoxRef.current;
  const height = filterH > 0 ? filterH : filterHRef.current;

  const pinStyle: CSSProperties | undefined = pinned
    ? {
        position: "fixed",
        top: Math.max(0, headerH - lift),
        left: box.left,
        width: box.width || "100%",
        zIndex: 1,
        // Do not set transform here — it would trap position:fixed filter sheets.
      }
    : undefined;

  return (
    <div className="relative flex min-w-0 flex-col">
      <div ref={sentinelRef} className="pointer-events-none h-0 w-full" aria-hidden />

      {pinned ? (
        <div className="pointer-events-none shrink-0" style={{ height }} aria-hidden />
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
        className={`relative z-10 flex min-w-0 flex-col gap-4 pt-3 ${
          overlapping ? "shadow-[0_-12px_28px_rgba(24,24,27,0.08)]" : ""
        }`}
        // Transparent so the fading filter stays visible under cards (not a white wipe).
        style={{ backgroundColor: "transparent" }}
      >
        {children}
      </div>
    </div>
  );
}
