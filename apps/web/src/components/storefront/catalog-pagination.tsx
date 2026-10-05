import Link from "next/link";
import type { CatalogQuery } from "@/lib/storefront/catalog-query";
import { buildCatalogHref } from "@/lib/storefront/catalog-query";
import { buildPaginationItems } from "@/lib/storefront/catalog-chips";

type CatalogPaginationProps = {
  query: CatalogQuery;
  page: number;
  totalPages: number;
};

export function CatalogPagination({ query, page, totalPages }: CatalogPaginationProps) {
  if (totalPages <= 1) return null;

  const items = buildPaginationItems(page, totalPages);

  return (
    <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="Paginare catalog">
      {page > 1 ? (
        <Link
          href={buildCatalogHref({ ...query, page: page - 1 })}
          className="inline-flex min-h-11 items-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          rel="prev"
        >
          Anterior
        </Link>
      ) : (
        <span className="inline-flex min-h-11 items-center rounded-xl border border-transparent px-4 text-sm text-zinc-400">
          Anterior
        </span>
      )}

      <ul className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          if (item === "ellipsis") {
            return (
              <li key={`e-${index}`} className="px-2 text-sm text-zinc-400" aria-hidden="true">
                …
              </li>
            );
          }
          const isCurrent = item === page;
          return (
            <li key={item}>
              <Link
                href={buildCatalogHref({ ...query, page: item })}
                aria-current={isCurrent ? "page" : undefined}
                className={
                  isCurrent
                    ? "inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    : "inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                }
              >
                {item}
              </Link>
            </li>
          );
        })}
      </ul>

      {page < totalPages ? (
        <Link
          href={buildCatalogHref({ ...query, page: page + 1 })}
          className="inline-flex min-h-11 items-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          rel="next"
        >
          Următor
        </Link>
      ) : (
        <span className="inline-flex min-h-11 items-center rounded-xl border border-transparent px-4 text-sm text-zinc-400">
          Următor
        </span>
      )}
    </nav>
  );
}
