"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  initialGallerySelectedIndex,
  type PublicVehicleImageDto,
} from "@/lib/storefront/public-gallery-helpers";
import { StorefrontMediaImage } from "@/components/storefront/storefront-media-image";

type PublicVehicleGalleryProps = {
  images: PublicVehicleImageDto[];
  vehicleLabel: string;
  accent?: string | null;
};

export function PublicVehicleGallery({
  images,
  vehicleLabel,
  accent,
}: PublicVehicleGalleryProps) {
  const router = useRouter();
  const color = accent ?? "#0f766e";
  const sorted = useMemo(
    () => [...images].sort((a, b) => a.sortOrder - b.sortOrder),
    [images],
  );
  const [selected, setSelected] = useState(() => initialGallerySelectedIndex(sorted));
  const [broken, setBroken] = useState<Record<number, boolean>>({});

  if (sorted.length === 0) return null;

  const safeIndex = Math.min(Math.max(selected, 0), sorted.length - 1);
  const active = sorted[safeIndex]!;
  const activeUrl = active.url && !broken[safeIndex] ? active.url : null;

  function selectIndex(index: number) {
    setSelected(index);
  }

  function go(delta: number) {
    setSelected((prev) => {
      const next = prev + delta;
      if (next < 0) return sorted.length - 1;
      if (next >= sorted.length) return 0;
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-[var(--sf-radius-lg)] bg-[var(--sf-surface-muted)]">
        {activeUrl ? (
          <div className="relative aspect-[16/10] w-full">
            <StorefrontMediaImage
              key={activeUrl}
              src={activeUrl}
              alt={active.altText ?? vehicleLabel}
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 720px"
              priority={safeIndex === 0}
              onError={() => setBroken((prev) => ({ ...prev, [safeIndex]: true }))}
            />
          </div>
        ) : (
          <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-sm text-[var(--sf-text-muted)]">Imagine indisponibilă momentan.</p>
            <button
              type="button"
              className="text-sm font-medium underline-offset-2 hover:underline"
              style={{ color }}
              onClick={() => {
                setBroken({});
                router.refresh();
              }}
            >
              Reîncarcă imaginile
            </button>
          </div>
        )}

        {sorted.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Imagine anterioară"
              className="absolute top-1/2 left-2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-lg font-semibold text-[var(--sf-text)] shadow-sm"
              onClick={() => go(-1)}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Imagine următoare"
              className="absolute top-1/2 right-2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-lg font-semibold text-[var(--sf-text)] shadow-sm"
              onClick={() => go(1)}
            >
              ›
            </button>

            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
              {sorted.slice(0, 8).map((_, index) => (
                <span
                  key={index}
                  className={`h-1.5 rounded-full ${
                    index === safeIndex ? "w-4 bg-white" : "w-1.5 bg-white/55"
                  }`}
                  aria-hidden
                />
              ))}
            </div>

            <p className="absolute right-3 bottom-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">
              {safeIndex + 1} / {sorted.length}
            </p>
          </>
        ) : null}
      </div>

      {sorted.length > 1 ? (
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {sorted.map((image, index) => {
            const thumbUrl = image.url && !broken[index] ? image.url : null;
            const isActive = index === safeIndex;
            return (
              <li key={`${image.sortOrder}-${index}`}>
                <button
                  type="button"
                  aria-label={`Vezi imaginea ${index + 1}`}
                  aria-current={isActive ? "true" : undefined}
                  className="w-full overflow-hidden rounded-[var(--sf-radius-sm)] border-2 bg-[var(--sf-surface-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{
                    borderColor: isActive ? color : "var(--sf-border)",
                  }}
                  onClick={() => selectIndex(index)}
                >
                  {thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbUrl}
                      alt={image.altText ?? `Miniatură ${index + 1}`}
                      className="aspect-[4/3] w-full object-cover"
                      onError={() => setBroken((prev) => ({ ...prev, [index]: true }))}
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center px-1 text-center text-[10px] leading-tight text-[var(--sf-text-muted)]">
                      Indisponibil
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
