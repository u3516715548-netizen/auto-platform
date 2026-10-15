import type { PublicCompanyView, PublicSeoSettingsView } from "@auto-platform/types";
import { isStablePublicImageUrl, toAbsolutePublicAssetUrl } from "./public-origin";

export type JsonLdObject = Record<string, unknown>;

type OrgInput = {
  dealerName: string;
  origin: string;
  company?: PublicCompanyView | null;
  seo?: PublicSeoSettingsView;
};

function postalAddress(company: PublicCompanyView | null | undefined): JsonLdObject | undefined {
  if (!company) return undefined;
  const street = company.showroomAddress ?? company.registeredAddress;
  if (!street && !company.city && !company.postalCode && !company.country) {
    return undefined;
  }
  return {
    "@type": "PostalAddress",
    ...(street ? { streetAddress: street } : {}),
    ...(company.city ? { addressLocality: company.city } : {}),
    ...(company.county ? { addressRegion: company.county } : {}),
    ...(company.postalCode ? { postalCode: company.postalCode } : {}),
    addressCountry: company.country ?? "RO",
  };
}

/**
 * Organization + AutoDealer/LocalBusiness when address/phone exist.
 * Safe fields only — no tenant id, no VIN, no internal paths.
 */
export function buildOrganizationJsonLd(input: OrgInput): JsonLdObject {
  const { dealerName, origin, company, seo } = input;
  const name = company?.tradingName?.trim() || company?.legalName?.trim() || dealerName;
  const logo =
    toAbsolutePublicAssetUrl(company?.logoPath, origin) ??
    toAbsolutePublicAssetUrl(seo?.ogImagePath, origin);
  const hasLocal =
    Boolean(company?.publicPhone) ||
    Boolean(company?.showroomAddress) ||
    Boolean(company?.city);

  const base: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": hasLocal ? ["Organization", "AutoDealer"] : "Organization",
    name,
    url: origin,
    ...(company?.legalName && company.legalName !== name
      ? { legalName: company.legalName }
      : {}),
    ...(company?.publicPhone ? { telephone: company.publicPhone } : {}),
    ...(company?.publicEmail ? { email: company.publicEmail } : {}),
    ...(logo && isStablePublicImageUrl(logo) ? { logo } : {}),
  };

  const address = postalAddress(company);
  if (address) base.address = address;

  return base;
}

export function buildWebSiteJsonLd(input: {
  dealerName: string;
  origin: string;
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: input.dealerName,
    url: input.origin,
    inLanguage: "ro-RO",
  };
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
  origin: string,
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${origin}${item.path.startsWith("/") ? item.path : `/${item.path}`}`,
    })),
  };
}

export function buildWebPageJsonLd(input: {
  name: string;
  description?: string;
  path: string;
  origin: string;
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    url: `${input.origin}${input.path.startsWith("/") ? input.path : `/${input.path}`}`,
    inLanguage: "ro-RO",
  };
}

/** FAQPage — only when FAQ is visible on the page. */
export function buildFaqPageJsonLd(
  items: Array<{ question: string; answer: string }>,
  origin: string,
  path: string,
): JsonLdObject | null {
  const cleaned = items
    .map((item) => ({
      question: item.question.trim(),
      answer: item.answer.trim(),
    }))
    .filter((item) => item.question.length >= 3 && item.answer.length >= 3);
  if (cleaned.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: `${origin}${path.startsWith("/") ? path : `/${path}`}`,
    mainEntity: cleaned.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

/**
 * ItemList for inventory landings — only when vehicles are actually rendered.
 * Uses public names/paths only (no VIN / internal ids).
 */
export function buildItemListJsonLd(input: {
  name: string;
  origin: string;
  path: string;
  items: Array<{ name: string; path: string }>;
}): JsonLdObject | null {
  if (input.items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: input.name,
    url: `${input.origin}${input.path.startsWith("/") ? input.path : `/${input.path}`}`,
    numberOfItems: input.items.length,
    itemListElement: input.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: `${input.origin}${item.path.startsWith("/") ? item.path : `/${item.path}`}`,
    })),
  };
}

/**
 * Prudent Product + Offer for vehicle PDP.
 * Requires name, url, price, currency. Image only if stable.
 * Never includes VIN or internal ids.
 * Best-effort for rich results — not a guarantee.
 */
export function buildVehicleProductJsonLd(input: {
  name: string;
  description?: string;
  path: string;
  origin: string;
  price: string;
  currency: string;
  imageUrl?: string | null;
  availability?: "InStock" | "OutOfStock";
}): JsonLdObject | null {
  const priceNum = Number.parseFloat(input.price);
  if (!Number.isFinite(priceNum) || priceNum < 0) return null;
  if (!input.name.trim() || !input.path.trim()) return null;

  const url = `${input.origin}${input.path.startsWith("/") ? input.path : `/${input.path}`}`;
  const image =
    input.imageUrl && isStablePublicImageUrl(input.imageUrl) ? input.imageUrl : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name.trim(),
    ...(input.description ? { description: input.description.slice(0, 5000) } : {}),
    url,
    ...(image ? { image: [image] } : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: input.currency || "EUR",
      price: priceNum.toFixed(2),
      availability: `https://schema.org/${input.availability ?? "InStock"}`,
      itemCondition: "https://schema.org/UsedCondition",
    },
  };
}
