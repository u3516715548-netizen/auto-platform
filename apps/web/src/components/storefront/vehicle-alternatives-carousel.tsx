"use client";

import { useRef } from "react";
import type { PublicVehicleCatalogDto } from "@/lib/storefront/public-vehicles";
import { PublicVehicleList } from "@/components/storefront/public-vehicle-list";
import { IconChevronLeft, IconChevronRight } from "@/components/storefront/icons";

type VehicleAlternativesCarouselProps = {
  vehicles: PublicVehicleCatalogDto[];
  title?: string;
  /** Demo preview: open vehicle in-place instead of Link navigation. */
  onSelectSlug?: (slug: string) => void;
};

/**
 * Horizontal alternatives strip — reuses catalog card styling via PublicVehicleList
 * inside a scroll container with Prev/Next controls.
 */
export function VehicleAlternativesCarousel({
  vehicles,
  title = "Alte alternative",
  onSelectSlug,
}: VehicleAlternativesCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (vehicles.length === 0) return null;

  function scrollByDir(dir: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const delta = Math.max(260, Math.floor(el.clientWidth * 0.8)) * dir;
    el.scrollBy({ left: delta, behavior: "smooth" });
  }

  return (
    <section aria-labelledby="vehicle-alternatives-heading" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="vehicle-alternatives-heading"
          className="text-xl font-bold tracking-tight text-[var(--sf-text)]"
        >
          {title}
        </h2>
        <div className="hidden items-center gap-1 sm:flex">
          <button
            type="button"
            onClick={() => scrollByDir(-1)}
            className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--sf-border)] bg-white text-[var(--sf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
            aria-label="Alternative anterioare"
          >
            <IconChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => scrollByDir(1)}
            className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--sf-border)] bg-white text-[var(--sf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
            aria-label="Alternative următoare"
          >
            <IconChevronRight size={18} />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        tabIndex={0}
        role="region"
        aria-label="Carusel alternative"
      >
        <div className="min-w-[36rem] sm:min-w-[48rem] lg:min-w-[64rem] [&_ul]:grid-cols-2 sm:[&_ul]:grid-cols-3 lg:[&_ul]:grid-cols-4">
          <PublicVehicleList vehicles={vehicles} onSelectSlug={onSelectSlug} />
        </div>
      </div>
    </section>
  );
}
