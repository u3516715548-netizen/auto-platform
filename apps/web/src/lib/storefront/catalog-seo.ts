import type { Metadata } from "next";

/**
 * True when the public catalog URL carries any query string key.
 * Search terms are never echoed into title/description.
 */
export function catalogUrlHasQueryString(
  params: Record<string, string | string[] | undefined>,
): boolean {
  return Object.keys(params).length > 0;
}

export function buildPublicCatalogMetadata(options: {
  dealerName: string;
  hasQuery: boolean;
}): Metadata {
  const { dealerName, hasQuery } = options;
  return {
    title: hasQuery ? `${dealerName} — Stoc auto — Căutare` : `${dealerName} — Stoc auto`,
    description: `Descoperă vehiculele disponibile la ${dealerName}.`,
    robots: hasQuery
      ? { index: false, follow: true }
      : { index: true, follow: true },
    alternates: { canonical: "/" },
  };
}
