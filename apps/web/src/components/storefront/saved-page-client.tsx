"use client";

import Link from "next/link";
import { IconClose } from "@/components/storefront/icons";
import { useStorefrontLists } from "@/components/storefront/storefront-lists-context";
import { publicCatalogPath, publicVehiclePath } from "@/lib/storefront/paths";
import {
  formatLiteFuel,
  formatLiteMileage,
  formatLitePrice,
} from "@/lib/storefront/storefront-vehicle-lite";

export function SavedPageClient() {
  const { saved, removeSaved, ready } = useStorefrontLists();

  if (!ready) {
    return <p className="text-sm text-[var(--sf-text-muted)]">Se încarcă salvările…</p>;
  }

  if (saved.length === 0) {
    return (
      <div className="rounded-[var(--sf-radius-lg)] border border-dashed border-[var(--sf-border)] bg-white px-4 py-10 text-center">
        <p className="text-base font-semibold text-[var(--sf-text)]">
          Nu ai mașini salvate încă.
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--sf-text-muted)]">
          Apasă iconița de salvare pe card sau pe pagina de detaliu. Salvările rămân pe acest
          dispozitiv.
        </p>
        <Link
          href={publicCatalogPath()}
          prefetch={false}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--sf-accent)" }}
        >
          Vezi catalogul
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {saved.map((vehicle) => {
        const title = `${vehicle.make} ${vehicle.model}`;
        return (
          <li key={vehicle.slug} className="relative min-w-0">
            <Link
              href={publicVehiclePath(vehicle.slug)}
              prefetch={false}
              className="flex h-full flex-col overflow-hidden rounded-[var(--sf-radius-lg)] border border-[var(--sf-border)] bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
            >
              <div className="aspect-[4/3] bg-[var(--sf-surface-muted)]">
                {vehicle.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={vehicle.coverImageUrl}
                    alt={vehicle.coverImageAlt ?? title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[var(--sf-text-muted)]">
                    Fără imagine
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <h2 className="text-base font-bold text-[var(--sf-text)]">{title}</h2>
                <p className="text-xl font-bold text-[var(--sf-text)]">
                  {formatLitePrice(vehicle)}
                </p>
                <p className="text-sm text-[var(--sf-text-muted)]">
                  {vehicle.year} · {formatLiteFuel(vehicle)} · {formatLiteMileage(vehicle)}
                </p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => removeSaved(vehicle.slug)}
              className="absolute top-3 right-3 z-10 inline-flex size-9 items-center justify-center rounded-full bg-white/95 text-[var(--sf-text)] shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
              aria-label={`Elimină ${title} din salvate`}
            >
              <IconClose size={14} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
