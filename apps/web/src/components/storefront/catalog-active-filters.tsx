import Link from "next/link";
import type { CatalogQuery } from "@/lib/storefront/catalog-query";
import {
  buildCatalogChips,
  catalogQueryHasFilterChips,
  hrefWithoutChip,
  resetCatalogHref,
} from "@/lib/storefront/catalog-chips";

type CatalogActiveFiltersProps = {
  query: CatalogQuery;
};

export function CatalogActiveFilters({ query }: CatalogActiveFiltersProps) {
  const chips = buildCatalogChips(query);
  const showReset = catalogQueryHasFilterChips(query);
  if (!showReset && chips.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {chips.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Filtre active">
          {chips.map((chip) => (
            <li key={chip.id}>
              <Link
                href={hrefWithoutChip(query, chip)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 text-sm text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <span>{chip.label}</span>
                <span aria-hidden="true" className="text-zinc-400">
                  ×
                </span>
                <span className="sr-only">Elimină filtrul {chip.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {showReset ? (
        <div>
          <Link
            href={resetCatalogHref()}
            className="inline-flex min-h-11 items-center text-sm font-medium text-blue-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Resetează filtre
          </Link>
        </div>
      ) : null}
    </div>
  );
}
