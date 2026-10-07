"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { PublicVehicleCatalogDto } from "@/lib/storefront/public-vehicles";
import { PublicVehicleList } from "@/components/storefront/public-vehicle-list";
import { IconChevronLeft, IconChevronRight } from "@/components/storefront/icons";

type VehicleAlternativesCarouselProps = {
  vehicles: PublicVehicleCatalogDto[];
  title?: string;
  /** Demo preview: open vehicle in-place instead of Link navigation. */
  onSelectSlug?: (slug: string) => void;
};

const AUTOPLAY_MS = 2000;
const MAX_ALTERNATIVES = 10;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Horizontal alternatives strip — single-row cards, Prev/Next, optional autoplay (~2s).
 */
export function VehicleAlternativesCarousel({
  vehicles,
  title = "Alte alternative",
  onSelectSlug,
}: VehicleAlternativesCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [canScroll, setCanScroll] = useState(false);

  const items = vehicles.slice(0, MAX_ALTERNATIVES);

  function scrollByDir(dir: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const delta = Math.max(240, Math.floor(el.clientWidth * 0.85)) * dir;
    el.scrollBy({ left: delta, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  const onAutoplayTick = useEffectEvent(() => {
    const el = scrollerRef.current;
    if (!el || paused || prefersReducedMotion()) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 4) return;
    const next = el.scrollLeft + Math.max(240, Math.floor(el.clientWidth * 0.85));
    if (next >= maxScroll - 2) {
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else {
      el.scrollBy({ left: Math.max(240, Math.floor(el.clientWidth * 0.85)), behavior: "smooth" });
    }
  });

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    function measure() {
      const node = scrollerRef.current;
      if (!node) return;
      setCanScroll(node.scrollWidth > node.clientWidth + 8);
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items.length]);

  useEffect(() => {
    if (paused || prefersReducedMotion() || items.length < 2) return;
    const id = window.setInterval(() => onAutoplayTick(), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, items.length, onAutoplayTick]);

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="vehicle-alternatives-heading" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="vehicle-alternatives-heading"
          className="text-xl font-bold tracking-tight text-[var(--sf-text)]"
        >
          {title}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setPaused(true);
              scrollByDir(-1);
            }}
            className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--sf-border)] bg-white text-[var(--sf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
            aria-label="Alternative anterioare"
          >
            <IconChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => {
              setPaused(true);
              scrollByDir(1);
            }}
            className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--sf-border)] bg-white text-[var(--sf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
            aria-label="Alternative următoare"
          >
            <IconChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollerRef}
          className="overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          tabIndex={0}
          role="region"
          aria-label="Carusel alternative"
          onPointerDown={() => setPaused(true)}
          onTouchStart={() => setPaused(true)}
          onKeyDown={() => setPaused(true)}
        >
          <div className="w-max max-w-none [&_ul]:!flex [&_ul]:w-max [&_ul]:grid-cols-none [&_ul]:flex-nowrap [&_ul]:gap-4 md:[&_ul]:gap-5 [&_li]:w-[min(78vw,17.5rem)] [&_li]:shrink-0 sm:[&_li]:w-[15.5rem] lg:[&_li]:w-[16.5rem]">
            <PublicVehicleList vehicles={items} onSelectSlug={onSelectSlug} />
          </div>
        </div>

        {canScroll ? (
          <div
            className="pointer-events-none absolute top-1/2 right-1 z-[1] flex -translate-y-1/2 items-center sm:hidden"
            aria-hidden
          >
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-white/95 text-[var(--sf-accent)] shadow-md ring-1 ring-[var(--sf-border)]">
              <IconChevronRight size={18} />
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
