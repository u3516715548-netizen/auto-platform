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
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--sf-border)] bg-white px-2.5 text-xs font-medium text-[var(--sf-text)] transition-colors hover:border-[var(--sf-accent)] hover:bg-[var(--sf-surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
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
            className="inline-flex min-h-9 items-center text-sm font-medium text-[var(--sf-accent)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
          >
            Resetează filtre
          </Link>
        </div>
      ) : null}
    </div>
  );
}
