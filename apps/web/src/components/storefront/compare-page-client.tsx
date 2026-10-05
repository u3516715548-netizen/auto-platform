"use client";

import Link from "next/link";
import { IconClose } from "@/components/storefront/icons";
import { useStorefrontLists } from "@/components/storefront/storefront-lists-context";
import { publicCatalogPath, publicVehiclePath } from "@/lib/storefront/paths";
import {
  COMPARE_MIN,
  formatLiteFuel,
  formatLiteMileage,
  formatLitePower,
  formatLitePrice,
  formatLiteTransmission,
  formatLiteVat,
  type StorefrontVehicleLite,
} from "@/lib/storefront/storefront-vehicle-lite";

const ROWS: Array<{
  key: string;
  label: string;
  value: (v: StorefrontVehicleLite) => string;
}> = [
  { key: "price", label: "Preț", value: formatLitePrice },
  { key: "vat", label: "TVA", value: formatLiteVat },
  { key: "year", label: "An", value: (v) => String(v.year) },
  { key: "km", label: "Kilometraj", value: formatLiteMileage },
  { key: "fuel", label: "Combustibil", value: formatLiteFuel },
  { key: "transmission", label: "Transmisie", value: formatLiteTransmission },
  { key: "power", label: "Putere", value: formatLitePower },
  {
    key: "location",
    label: "Locație",
    value: (v) => v.locationCity ?? "—",
  },
  {
    key: "stock",
    label: "Status stoc",
    value: () => "În stoc",
  },
];

export function ComparePageClient() {
  const { compare, removeCompare, clearCompare, ready } = useStorefrontLists();

  if (!ready) {
    return <p className="text-sm text-[var(--sf-text-muted)]">Se încarcă comparația…</p>;
  }

  if (compare.length < COMPARE_MIN) {
    return (
      <div className="rounded-[var(--sf-radius-lg)] border border-dashed border-[var(--sf-border)] bg-white px-4 py-10 text-center">
        <p className="text-base font-semibold text-[var(--sf-text)]">
          Selectează între {COMPARE_MIN} și 4 mașini pentru comparație.
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--sf-text-muted)]">
          Folosește butonul „Compară” pe carduri sau pe pagina de detaliu.
        </p>
        <Link
          href={publicCatalogPath()}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--sf-accent)" }}
        >
          Înapoi la catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--sf-text-muted)]">
          {compare.length} mașini în comparație
        </p>
        <button
          type="button"
          onClick={clearCompare}
          className="inline-flex min-h-10 items-center rounded-full border border-[var(--sf-border)] px-3 text-sm font-medium text-[var(--sf-text)]"
        >
          Golește comparația
        </button>
      </div>

      <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
        <table className="min-w-full border-separate border-spacing-x-2 border-spacing-y-0">
          <thead>
            <tr>
              {compare.map((vehicle) => (
                <th
                  key={vehicle.slug}
                  className="w-[min(220px,70vw)] min-w-[180px] align-top"
                >
                  <div className="relative overflow-hidden rounded-[var(--sf-radius-lg)] border border-[var(--sf-border)] bg-white">
                    <button
                      type="button"
                      onClick={() => removeCompare(vehicle.slug)}
                      className="absolute top-2 right-2 z-10 inline-flex size-8 items-center justify-center rounded-full bg-white/95 text-[var(--sf-text)] shadow-sm"
                      aria-label={`Elimină ${vehicle.make} ${vehicle.model} din comparație`}
                    >
                      <IconClose size={14} />
                    </button>
                    <div className="aspect-[4/3] bg-[var(--sf-surface-muted)]">
                      {vehicle.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={vehicle.coverImageUrl}
                          alt={
                            vehicle.coverImageAlt ?? `${vehicle.make} ${vehicle.model}`
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-[var(--sf-text-muted)]">
                          Fără imagine
                        </div>
                      )}
                    </div>
                    <div className="p-3 text-left">
                      <Link
                        href={publicVehiclePath(vehicle.slug)}
                        className="text-base font-bold text-[var(--sf-text)] underline-offset-2 hover:underline"
                      >
                        {vehicle.make} {vehicle.model}
                      </Link>
                      <p className="mt-1 text-lg font-bold text-[var(--sf-text)]">
                        {formatLitePrice(vehicle)}
                      </p>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key}>
                {compare.map((vehicle) => (
                  <td
                    key={`${row.key}-${vehicle.slug}`}
                    className="border-b border-[var(--sf-border)] px-1 py-3 align-top"
                  >
                    <p className="text-[10px] font-semibold tracking-wide text-[var(--sf-text-muted)] uppercase">
                      {row.label}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-[var(--sf-text)]">
                      {row.value(vehicle)}
                    </p>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
