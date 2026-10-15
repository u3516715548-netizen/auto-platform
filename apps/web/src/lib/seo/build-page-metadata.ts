import type { Metadata } from "next";
import type { PublicSeoSettingsView, PublicTenantPageView } from "@auto-platform/types";
import {
  isStablePublicImageUrl,
  toAbsolutePublicAssetUrl,
} from "@/lib/seo/public-origin";
import { applySeoTitleTemplate } from "@/lib/seo/title-template";

function resolveOgImages(
  seo: PublicSeoSettingsView | undefined,
  origin: string | undefined,
  pageImage?: string | null,
): Array<{ url: string }> | undefined {
  const candidates: string[] = [];
  if (pageImage && isStablePublicImageUrl(pageImage)) {
    candidates.push(pageImage);
  }
  if (origin && seo?.ogImagePath) {
    const absolute = toAbsolutePublicAssetUrl(seo.ogImagePath, origin);
    if (absolute && isStablePublicImageUrl(absolute)) {
      candidates.push(absolute);
    }
  }
  if (candidates.length === 0) return undefined;
  return candidates.map((url) => ({ url }));
}

function withSocialMetadata(
  base: Metadata,
  options: {
    seo?: PublicSeoSettingsView;
    origin?: string;
    path?: string;
    pageImage?: string | null;
    ogType?: "website" | "article";
  },
): Metadata {
  const { seo, origin, path, pageImage, ogType = "website" } = options;
  const title = typeof base.title === "string" ? base.title : undefined;
  const description =
    typeof base.description === "string" ? base.description : undefined;
  const canonicalPath =
    path ??
    (typeof base.alternates?.canonical === "string"
      ? base.alternates.canonical
      : undefined);
  const absoluteUrl =
    origin && canonicalPath
      ? `${origin}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`
      : undefined;
  const images = resolveOgImages(seo, origin, pageImage);
  const twitterImages = images?.map((img) => img.url);

  return {
    ...base,
    ...(origin ? { metadataBase: new URL(origin) } : {}),
    openGraph: {
      type: ogType,
      locale: "ro_RO",
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(absoluteUrl ? { url: absoluteUrl } : {}),
      ...(images ? { images } : {}),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(twitterImages ? { images: twitterImages } : {}),
      ...(seo?.twitterHandle ? { site: `@${seo.twitterHandle}`, creator: `@${seo.twitterHandle}` } : {}),
    },
  };
}

export function buildPublicCmsPageMetadata(options: {
  page: PublicTenantPageView;
  dealerName: string;
  seo?: PublicSeoSettingsView;
  origin?: string;
}): Metadata {
  const { page, dealerName, seo, origin } = options;
  const rawTitle =
    page.seoTitle?.trim() ||
    seo?.seoTitleDefault?.trim() ||
    `${page.title} | ${dealerName}`;
  const title = seo?.titleTemplate
    ? applySeoTitleTemplate(
        page.seoTitle?.trim() || page.title,
        dealerName,
        seo.titleTemplate,
      )
    : rawTitle;
  const description =
    page.seoDescription?.trim() ||
    seo?.seoDescriptionDefault?.trim() ||
    `${page.title} — ${dealerName}`;
  const tenantIndexing = seo?.indexingEnabled !== false;
  const pageIndexing = page.noindex !== true;
  const indexing = tenantIndexing && pageIndexing;
  /** Absolute-ready relative path: self or validated override. */
  const path = page.canonicalPath || `/p/${page.slug}`;
  const pageOg =
    page.ogImagePath && origin
      ? (() => {
          const abs = toAbsolutePublicAssetUrl(page.ogImagePath, origin);
          return abs && isStablePublicImageUrl(abs) ? abs : null;
        })()
      : page.ogImagePath && isStablePublicImageUrl(page.ogImagePath)
        ? page.ogImagePath
        : null;

  return withSocialMetadata(
    {
      title,
      description,
      robots: indexing ? { index: true, follow: true } : { index: false, follow: true },
      alternates: { canonical: path },
      ...(seo?.faviconPath ? { icons: { icon: seo.faviconPath } } : {}),
    },
    { seo, origin, path, pageImage: pageOg },
  );
}

export function applySeoDefaultsToCatalogMetadata(
  base: Metadata,
  seo: PublicSeoSettingsView | undefined,
  dealerName: string,
  origin?: string,
): Metadata {
  if (!seo) {
    return withSocialMetadata(base, { origin, path: "/" });
  }
  const isSearch = String(base.title ?? "").includes("Căutare");
  const baseTitle =
    typeof base.title === "string"
      ? base.title
      : isSearch
        ? `${dealerName} — Stoc auto — Căutare`
        : `${dealerName} — Stoc auto`;
  const title = isSearch
    ? baseTitle
    : seo.seoTitleDefault?.trim() ||
      (seo.titleTemplate
        ? applySeoTitleTemplate("Stoc auto", dealerName, seo.titleTemplate)
        : baseTitle);
  const description =
    seo.seoDescriptionDefault?.trim() ||
    (typeof base.description === "string" ? base.description : undefined) ||
    `Descoperă vehiculele disponibile la ${dealerName}.`;

  const robots =
    seo.indexingEnabled === false
      ? { index: false, follow: true }
      : base.robots;

  return withSocialMetadata(
    {
      ...base,
      title,
      description,
      robots,
      ...(seo.faviconPath ? { icons: { icon: seo.faviconPath } } : {}),
    },
    { seo, origin, path: "/" },
  );
}

export function buildPublicVehiclePageMetadata(options: {
  title: string;
  description: string;
  slug: string;
  seo?: PublicSeoSettingsView;
  origin?: string;
  /** Only used when stable (not signed Storage URL). */
  pageImage?: string | null;
}): Metadata {
  const { title, description, slug, seo, origin, pageImage } = options;
  const indexing = seo?.indexingEnabled !== false;
  const path = `/vehicles/${slug}`;

  return withSocialMetadata(
    {
      title,
      description,
      alternates: { canonical: path },
      robots: indexing ? { index: true, follow: true } : { index: false, follow: true },
      ...(seo?.faviconPath ? { icons: { icon: seo.faviconPath } } : {}),
    },
    { seo, origin, path, pageImage, ogType: "website" },
  );
}

/** Utility/tool pages that must never be indexed. */
export function buildForcedNoindexMetadata(title: string): Metadata {
  return {
    title,
    robots: { index: false, follow: false },
  };
}
