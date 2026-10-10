import type { Metadata } from "next";
import type { PublicSeoSettingsView, PublicTenantPageView } from "@auto-platform/types";

export function buildPublicCmsPageMetadata(options: {
  page: PublicTenantPageView;
  dealerName: string;
  seo?: PublicSeoSettingsView;
}): Metadata {
  const { page, dealerName, seo } = options;
  const title =
    page.seoTitle?.trim() ||
    seo?.seoTitleDefault?.trim() ||
    `${page.title} | ${dealerName}`;
  const description =
    page.seoDescription?.trim() ||
    seo?.seoDescriptionDefault?.trim() ||
    `${page.title} — ${dealerName}`;
  const indexing = seo?.indexingEnabled !== false;

  return {
    title,
    description,
    robots: indexing ? { index: true, follow: true } : { index: false, follow: true },
    alternates: { canonical: `/p/${page.slug}` },
    ...(seo?.faviconPath
      ? { icons: { icon: seo.faviconPath } }
      : {}),
  };
}

export function applySeoDefaultsToCatalogMetadata(
  base: Metadata,
  seo: PublicSeoSettingsView | undefined,
  dealerName: string,
): Metadata {
  if (!seo) return base;
  const isSearch = String(base.title ?? "").includes("Căutare");
  const title = isSearch
    ? (typeof base.title === "string" ? base.title : `${dealerName} — Stoc auto — Căutare`)
    : seo.seoTitleDefault?.trim() ||
      (typeof base.title === "string" ? base.title : `${dealerName} — Stoc auto`);
  const description =
    seo.seoDescriptionDefault?.trim() ||
    (typeof base.description === "string" ? base.description : undefined) ||
    `Descoperă vehiculele disponibile la ${dealerName}.`;

  const robots =
    seo.indexingEnabled === false
      ? { index: false, follow: true }
      : base.robots;

  return {
    ...base,
    title,
    description,
    robots,
    ...(seo.faviconPath ? { icons: { icon: seo.faviconPath } } : {}),
  };
}
